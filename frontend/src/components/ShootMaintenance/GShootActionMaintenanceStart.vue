<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="600"
    :caption="caption"
    :text="buttonText"
    confirm-button-text="Trigger now"
    icon="mdi-refresh"
    :disabled="!isMaintenancePreconditionSatisfied"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <div class="text-subtitle-1 pt-4">
          Do you want to start the maintenance of your cluster outside of the configured maintenance time window?
        </div>
        <g-maintenance-components
          title="The following updates might be performed"
          :selectable="false"
        />
      </v-card-text>
    </template>
  </g-action-button-dialog>
</template>

<script>

import {
  ref,
  computed,
  watch,
} from 'vue'

import { useAppStore } from '@/store/app'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'
import GMaintenanceComponents from '@/components/ShootMaintenance/GMaintenanceComponents'

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GActionButtonDialog,
    GMaintenanceComponents,
  },
  inject: ['api', 'logger'],
  props: {
    text: {
      type: Boolean,
      default: false,
    },
  },
  setup (props) {
    const {
      shootItem,
      shootName,
      shootNamespace,
      shootGardenerOperation,
      isMaintenancePreconditionSatisfied,
      maintenancePreconditionSatisfiedMessage,
    } = useShootItem()

    const isMaintenanceToBeScheduled = computed(() => {
      return shootGardenerOperation.value === 'maintain'
    })

    const caption = computed(() => {
      if (!isMaintenancePreconditionSatisfied.value) {
        return maintenancePreconditionSatisfiedMessage.value
      }
      if (isMaintenanceToBeScheduled.value) {
        return 'Requesting to schedule cluster maintenance'
      }
      return buttonTitle.value
    })

    const buttonTitle = computed(() => {
      return 'Schedule Maintenance'
    })

    const buttonText = computed(() => {
      if (!props.text) {
        return
      }
      return buttonTitle.value
    })

    const maintenanceTriggered = ref(false)

    const appStore = useAppStore()

    watch(isMaintenanceToBeScheduled, value => {
      const isMaintenanceScheduled = !value && maintenanceTriggered.value
      if (!isMaintenanceScheduled) {
        return
      }
      maintenanceTriggered.value = false

      if (!shootName.value) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      appStore.setSuccess(`Maintenance scheduled for ${shootName.value}`)
    })

    return {
      shootItem,
      shootName,
      shootNamespace,
      shootGardenerOperation,
      isMaintenancePreconditionSatisfied,
      maintenancePreconditionSatisfiedMessage,
      maintenanceTriggered,
      isMaintenanceToBeScheduled,
      caption,
      buttonTitle,
      buttonText,
    }
  },

  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.startMaintenance()
      }
    },
    async startMaintenance () {
      this.maintenanceTriggered = true
      try {
        await this.api.addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            'gardener.cloud/operation': 'maintain',
          },
        })
      } catch (err) {
        const errorMessage = 'Could not start maintenance'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.maintenanceTriggered = false
      }
    },
  },
}
</script>
