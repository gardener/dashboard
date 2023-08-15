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
      alert-banner-identifier="newShootEditorWarning"
      :shoot-item="newShootResource"
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

import {
  useShootStore,
  useAuthzStore,
  useAppStore,
} from '@/store'
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import { useAsyncRef } from '@/composables'
import { errorDetailsFromError } from '@/utils/error'
import { isEqual } from '@/utils/lodash'

export default {
  components: {
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GConfirmDialog,
  },
  inject: ['yaml', 'logger'],
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShoot') {
      try {
        const shootResource = await this.getShootResource()
        this.setNewShootResource(shootResource)
        return next()
      } catch (err) {
        this.errorMessage = err.message
        return next(false)
      }
    }
    if (this.isShootCreated) {
      return next()
    }
    if (!this.isShootCreated && await this.isShootContentDirty()) {
      if (!await this.confirmEditorNavigation()) {
        this.shootEditor.dispatch('focus')
        return next(false)
      }
    }
    return next()
  },
  setup () {
    return {
      ...useAsyncRef('shootEditor'),
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'namespace',
    ]),
    ...mapState(useShootStore, [
      'newShootResource',
      'initialNewShootResource',
    ]),
  },
  methods: {
    ...mapActions(useShootStore, [
      'setNewShootResource',
      'createShoot',
    ]),
    ...mapActions(useAppStore, ['alert']),
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Leave',
        captionText: 'Leave Create Cluster Page?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your changes?',
      })
    },
    async getShootResource () {
      const content = await this.shootEditor.dispatch('getContent')
      return this.yaml.load(content)
    },
    async createClicked () {
      try {
        const shootResource = await this.getShootResource()
        await this.createShoot(shootResource)
        this.isShootCreated = true
        this.$router.push({
          name: 'ShootItem',
          params: {
            namespace: this.namespace,
            name: shootResource.metadata.name,
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
    async isShootContentDirty () {
      const shootResource = await this.getShootResource()
      return !isEqual(this.initialNewShootResource, shootResource)
    },
  },
}
</script>
