<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :shoot-item="shootItem"
    width="450"
    caption="Configure Purpose"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-purpose
          ref="purposeRef"
          :secret="secret"
          @update-purpose="onUpdatePurpose"
        />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { defineAsyncComponent } from 'vue'
import { mapState } from 'pinia'

import { useSecretStore } from '@/store/secret'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useAsyncRef } from '@/composables/useAsyncRef'

import { errorDetailsFromError } from '@/utils/error'
import shootItem from '@/mixins/shootItem'

import { find } from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
  },
  mixins: [
    shootItem,
  ],
  inject: ['api', 'logger'],
  setup () {
    return {
      ...useAsyncRef('purpose'),
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      purposeValue: undefined,
    }
  },
  computed: {
    ...mapState(useSecretStore, ['infrastructureSecretList']),
    secret () {
      const secrets = this.infrastructureSecretList
      const secret = find(secrets, ['metadata.name', this.shootSecretBindingName])
      if (!secret) {
        this.logger.error('Secret must not be undefined')
      }
      return secret
    },
  },
  methods: {
    onUpdatePurpose (purpose) {
      this.purposeValue = purpose
    },
    async onConfigurationDialogOpened () {
      await this.reset()
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        await this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.updateShootPurpose({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            purpose: this.purposeValue,
          },
        })
      } catch (err) {
        const errorMessage = 'Could not update purpose'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.purposeValue = this.shootPurpose
      await this.purpose.dispatch('setPurpose', this.purposeValue)
    },
  },
}
</script>
