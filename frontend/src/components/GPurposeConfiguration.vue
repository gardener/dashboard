<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="450"
    caption="Configure Purpose"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-purpose
          v-model="purpose"
          :purposes="allPurposes"
        />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import {
  ref,
  defineAsyncComponent,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useShootItem } from '@/composables/useShootItem'
import { useShootHelper } from '@/composables/useShootHelper'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GPurpose: defineAsyncComponent(() => import('@/components/GPurpose')),
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootNamespace,
      shootName,
      shootPurpose,
    } = useShootItem()

    const {
      allPurposes,
    } = useShootHelper()

    const purpose = ref(shootPurpose.value)

    return {
      v$: useVuelidate(),
      shootNamespace,
      shootName,
      shootPurpose,
      allPurposes,
      purpose,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.purpose = this.shootPurpose
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
            purpose: this.purpose,
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
  },
}
</script>
