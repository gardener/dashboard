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
import GConfirmDialog from '@/components/dialogs/GConfirmDialog'
import { mapState, mapActions } from 'pinia'
import { errorDetailsFromError } from '@/utils/error'
import { useShootStore, useAuthzStore, useAppStore } from '@/store'
import { useAsyncRef } from '@/composables'

// lodash
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

export default {
  components: {
    GShootEditor: defineAsyncComponent(() => import('@/components/GShootEditor')),
    GConfirmDialog,
  },
  inject: ['yaml', 'api', 'logger'],
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShoot') {
      try {
        const shootResource = await this.getShootResource()
        this.setNewShootResource(shootResource)
        return next()
      } catch (err) {
        this.errorMessage = get(err, 'response.data.message', err.message)
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
    ...mapState(useAuthzStore, ['namespace']),
    ...mapState(useShootStore, ['newShootResource', 'initialNewShootResource']),
  },
  methods: {
    ...mapActions(useShootStore, ['setNewShootResource']),
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
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to create cluster.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async isShootContentDirty () {
      const shootResource = await this.getShootResource()
      return !isEqual(this.initialNewShootResource, shootResource)
    },
    async createShoot (shootResource) {
      await this.api.createShoot({ namespace: this.namespace, data: shootResource })
      this.alert = {
        type: 'success',
        title: 'Cluster created',
      }
    },
  },
}
</script>
