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
        By modifying the resource directly you may cause serious problems in your cluster.
        We cannot guarantee that you can solve problems that result from using Cluster Editor incorrectly.
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
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import { mapState, mapActions } from 'pinia'

import { useAsyncRef } from '@/composables'
import { defineAsyncComponent } from 'vue'

import {
  useAuthzStore,
  useShootStore,
} from '@/store'

// lodash
import get from 'lodash/get'
import pick from 'lodash/pick'

export default {
  components: {
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GConfirmDialog,
  },
  inject: ['yaml', 'api'],
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
        'Ctrl-S': (instance) => {
          vm.save()
        },
        'Cmd-S': (instance) => {
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
      return this.yaml.load(content)
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
        this.errorMessage = get(err, 'response.data.message', err.message)
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
