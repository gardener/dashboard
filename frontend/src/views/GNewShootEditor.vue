<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="fill-height">
    <g-shoot-editor
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      alert-banner-identifier="newShootEditorWarning"
    >
      <template #modificationWarning>
        By modifying the resource directly you may create an invalid cluster resource.
        If the resource is invalid, you may lose data when switching back to the overview page.
      </template>
      <template #toolbarItemsRight>
        <v-btn
          variant="text"
          color="primary"
          @click.stop="createClicked()"
        >
          Create
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

import { useShootContextStore } from '@/store/shootContext'
import { useAppStore } from '@/store/app'

import GConfirmDialog from '@/components/dialogs/GConfirmDialog'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GConfirmDialog,
  },
  inject: ['logger'],
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShoot') {
      try {
        const object = this.getEditorContent()
        this.setShootManifest(object)
        return next()
      } catch (err) {
        console.error(err)
        this.errorMessage = err.message
        return next(false)
      }
    }
    if (this.isShootCreated) {
      return next()
    }
    if (this.isShootDirty) {
      if (!await this.confirmEditorNavigation()) {
        this.shootManifestEditor?.focus()
        return next(false)
      }
    }
    return next()
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
    }
  },
  computed: {
    ...mapState(useShootContextStore, [
      'shootNamespace',
      'shootName',
      'isShootDirty',
      'cmInstance',
    ]),
  },
  methods: {
    ...mapActions(useShootContextStore, [
      'createShoot',
      'setShootManifest',
    ]),
    ...mapActions(useAppStore, ['alert']),
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Leave',
        captionText: 'Leave Create Cluster Page?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your changes?',
      })
    },
    getEditorContent () {
      const content = this.cmInstance.doc.getValue()
      return yaml.load(content)
    },
    async createClicked () {
      try {
        await this.createShoot(this.getEditorContent())
        this.isShootCreated = true
        this.$router.push({
          name: 'ShootItem',
          params: {
            namespace: this.shootNamespace,
            name: this.shootName,
          },
        })
      } catch (err) {
        this.errorMessage = 'Failed to create cluster.'
        if (err.response) {
          const errorDetails = errorDetailsFromError(err)
          this.detailedErrorMessage = errorDetails.detailedMessage
        } else {
          this.detailedErrorMessage = err.message
        }
        this.logger.error(this.errorMessage, this.detailedErrorMessage, err)
      }
    },
  },
}
</script>
