<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="1300"
    caption="Configure Hibernation Schedule"
    @before-dialog-opened="setShootManifest(shootItem)"
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
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog'
import GManageHibernationSchedule from '@/components/ShootHibernation/GManageHibernationSchedule'

import { useShootContext } from '@/composables/useShootContext'
import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'
import { v4 as uuidv4 } from '@/utils/uuid'

export default {
  components: {
    GActionButtonDialog,
    GManageHibernationSchedule,
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

    const {
      hibernationSchedules,
      noHibernationSchedules,
      setShootManifest,
    } = useShootContext()

    const componentKey = ref(uuidv4())

    return {
      v$: useVuelidate(),
      shootItem,
      shootNamespace,
      shootName,
      isHibernationPossible,
      hibernationPossibleMessage,
      hibernationSchedules,
      noHibernationSchedules,
      setShootManifest,
      componentKey,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
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
