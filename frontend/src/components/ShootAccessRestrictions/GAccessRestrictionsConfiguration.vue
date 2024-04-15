<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    :disabled="disabled"
    :tooltip="tooltip"
    width="900"
    caption="Configure Access Restrictions"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-access-restrictions />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GAccessRestrictions from '@/components/ShootAccessRestrictions/GAccessRestrictions'

import { useShootItem } from '@/composables/useShootItem'
import { useShootHelper } from '@/composables/useShootHelper'

import { errorDetailsFromError } from '@/utils/error'

import { isEmpty } from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
    GAccessRestrictions,
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
    } = useShootItem()

    const {
      accessRestrictionDefinitionList,
      accessRestrictionNoItemsText,
    } = useShootHelper(shootItem)

    const shootContextStore = useShootContextStore()
    const {
      shootManifest,
    } = storeToRefs(shootContextStore)
    const {
      setShootManifest,
    } = shootContextStore

    const disabled = computed(() => {
      return isEmpty(accessRestrictionDefinitionList.value)
    })

    const tooltip = computed(() => {
      return disabled.value
        ? accessRestrictionNoItemsText.value
        : ''
    })

    return {
      shootItem,
      shootNamespace,
      shootName,
      shootManifest,
      setShootManifest,
      disabled,
      tooltip,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.setShootManifest(this.shootItem)
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await this.api.replaceShoot({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: this.shootManifest,
        })
      } catch (err) {
        const errorMessage = 'Could not save access restriction configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
