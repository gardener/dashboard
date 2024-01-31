<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="fill-height">
    <g-shoot-editor
      ref="shootEditorRef"
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      alert-banner-identifier="shootEditorWarning"
      :shoot-item="shootItem"
      :extra-keys="extraKeys"
      @clean="onClean"
      @conflict-path="onConflictPath"
    >
      <template #modificationWarning>
        Directly modifying this resource can result in irreversible configurations that may severely compromise your cluster's stability and functionality.
        Use resource editor with caution.
      </template>
      <template #toolbarItemsRight>
        <v-btn
          variant="text"
          :disabled="clean"
          color="primary"
          @click.stop="save()"
        >
          Save
        </v-btn>
      </template>
    </g-shoot-editor>
    <g-confirm-dialog ref="confirmDialog" />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import {
  mapState,
  mapActions,
} from 'pinia'
import yaml from 'js-yaml'

import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'

import GConfirmDialog from '@/components/dialogs/GConfirmDialog'

import { useAsyncRef } from '@/composables/useAsyncRef'

import { errorDetailsFromError } from '@/utils/error'

import { pick } from '@/lodash'

export default {
  components: {
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GConfirmDialog,
  },
  inject: ['api', 'logger'],
  async beforeRouteLeave (to, from, next) {
    if (this.clean) {
      return next()
    }
    try {
      if (await this.confirmEditorNavigation()) {
        next()
      } else {
        this.focus()
        next(false)
      }
    } catch (err) {
      next(err)
    }
  },
  setup () {
    return {
      ...useAsyncRef('shootEditor'),
    }
  },
  data () {
    const vm = this
    return {
      clean: true,
      hasConflict: false,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
      extraKeys: {
        'Ctrl-S': instance => {
          vm.save()
        },
        'Cmd-S': instance => {
          vm.save()
        },
      },
    }
  },
  computed: {
    ...mapState(useAuthzStore, ['namespace']),
    shootItem () {
      return this.shootByNamespaceAndName(this.$route.params) || {}
    },
  },
  methods: {
    ...mapActions(useShootStore, ['shootByNamespaceAndName']),
    onClean (clean) {
      this.clean = clean
    },
    onConflictPath (conflictPath) {
      this.hasConflict = !!conflictPath
    },
    async getShootResource () {
      const content = await this.shootEditor.dispatch('getContent')
      return yaml.load(content)
    },
    async save () {
      try {
        if (this.untouched) {
          return
        }
        if (this.clean) {
          this.shootEditor.dispatch('clearHistory')
          return
        }
        if (this.hasConflict && !(await this.confirmOverwrite())) {
          return
        }

        const paths = ['spec', 'metadata.labels', 'metadata.annotations']
        const shootResource = await this.getShootResource()
        const data = pick(shootResource, paths)
        const { metadata: { namespace, name } } = this.shootItem
        const { data: value } = await this.api.replaceShoot({ namespace, name, data })
        await this.shootEditor.dispatch('update', value)

        this.snackbarColor = 'success'
        this.snackbarText = 'Cluster specification has been successfully updated'
        this.snackbar = true
      } catch (err) {
        this.errorMessage = 'Failed to save changes.'
        if (err.response) {
          const errorDetails = errorDetailsFromError(err)
          this.detailedErrorMessage = errorDetails.detailedMessage
        } else {
          this.detailedErrorMessage = err.message
        }
        this.logger.error(this.errorMessage, this.detailedErrorMessage, err)
      }
    },
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        captionText: 'Leave Editor?',
        messageHtml: 'Your changes have not been saved.<br/>Are you sure you want to leave the editor?',
      })
    },
    confirmOverwrite () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Save',
        captionText: 'Confirm Overwrite',
        messageHtml: 'Meanwhile another user or process has changed the cluster resource.<br/>Are you sure you want to overwrite it?',
      })
    },
    focus () {
      this.shootEditor.dispatch('focus')
    },
  },

}
</script>
