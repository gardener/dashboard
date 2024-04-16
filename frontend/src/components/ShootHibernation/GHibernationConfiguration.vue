<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="1300"
    caption="Configure Hibernation Schedule"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <g-manage-hibernation-schedule
          :key="componentKey"
          :is-hibernation-possible="isHibernationPossible"
          :hibernation-possible-message="hibernationPossibleMessage"
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
import { storeToRefs } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useShootContextStore } from '@/store/shootContext'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  components: {
    GActionButtonDialog,
    GManageHibernationSchedule: defineAsyncComponent(() => import('@/components/ShootHibernation/GManageHibernationSchedule')),
  },
  inject: ['api', 'logger'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
      isHibernationPossible,
      hibernationPossibleMessage,
    } = useShootItem()

    const shootContextStore = useShootContextStore()
    const {
      hibernationSchedules,
      noHibernationSchedules,
    } = storeToRefs(shootContextStore)
    const {
      setShootManifest,
    } = shootContextStore

    const componentKey = ref(uuidv4())

    return {
      v$: useVuelidate(),
      shootItem,
      shootNamespace,
      shootName,
      isHibernationPossible,
      hibernationPossibleMessage,
      setShootManifest,
      hibernationSchedules,
      noHibernationSchedules,
      componentKey,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      this.setShootManifest(this.shootItem)
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        if (await this.updateConfiguration()) {
          this.componentKey = uuidv4() // force re-render
        }
      } else {
        this.componentKey = uuidv4() // force re-render
      }
    },
    async updateConfiguration () {
      try {
        await Promise.all([
          this.api.updateShootHibernationSchedules({
            namespace: this.shootNamespace,
            name: this.shootName,
            data: this.hibernationSchedules,
          }),
          this.api.addShootAnnotation({
            namespace: this.shootNamespace,
            name: this.shootName,
            data: {
              'dashboard.garden.sapcloud.io/no-hibernation-schedule': this.noHibernationSchedules ? 'true' : null,
            },
          }),
        ])
        return true
      } catch (err) {
        const errorMessage = 'Could not save hibernation configuration'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        return false
      }
    },
    showDialog () { // called from ShootLifeCycleCard
      this.$refs.actionDialog.showDialog()
    },
  },
}
</script>
