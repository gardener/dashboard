<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    :shoot-item="shootItem"
    :valid="valid"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    width="450"
    caption="Configure Purpose">
    <template v-slot:actionComponent>
      <g-purpose
        :secret="secret"
        @update-purpose="onUpdatePurpose"
        @valid="onPurposeValid"
        ref="purposeRef"
      ></g-purpose>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { mapState } from 'pinia'
import find from 'lodash/find'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { errorDetailsFromError } from '@/utils/error'

import shootItem from '@/mixins/shootItem'
import { useAsyncRef } from '@/composables'

import {
  useSecretStore,
} from '@/store'

export default {
  setup () {
    return {
      ...useAsyncRef('purpose'),
    }
  },
  components: {
    GActionButtonDialog,
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
  },
  inject: ['api'],
  mixins: [
    shootItem,
  ],
  data () {
    return {
      purposeValue: undefined,
      purposeValid: false,
    }
  },
  computed: {
    ...mapState(useSecretStore, ['infrastructureSecretList']),
    valid () {
      return this.purposeValid
    },
    secret () {
      const secrets = this.infrastructureSecretList
      const secret = find(secrets, ['metadata.name', this.shootSecretBindingName])
      if (!secret) {
        console.error('Secret must not be undefined')
      }
      return secret
    },
  },
  methods: {
    onPurposeValid (value) {
      this.purposeValid = value
    },
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
        console.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async reset () {
      this.purposeValue = this.shootPurpose
      await this.purpose.dispatch('setPurpose', this.purposeValue)
    },
  },
}
</script>
