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
    :loading="isReconcileToBeScheduled"
    :disabled="isShootReconciliationDeactivated"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <v-row>
          <v-col class="text-subtitle-1">
            Do you want to trigger a reconcile of your cluster outside of the regular reconciliation schedule?
          </v-col>
        </v-row>
        <v-row v-if="lastOperationFailed">
          <v-col class="text-subtitle-1">
            Note: For clusters in failed state this will retry the operation.
          </v-col>
        </v-row>
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

import { useShootItem } from '@/composables/useShootItem'

import { errorDetailsFromError } from '@/utils/error'

import { get } from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
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
      shootNamespace,
      shootName,
      shootGeneration,
      isShootReconciliationDeactivated,
      shootLastOperation,
    } = useShootItem()

    const reconcileTriggered = ref(false)
    const currentGeneration = ref(null)

    const isReconcileToBeScheduled = computed(() => {
      return shootGeneration.value === currentGeneration.value
    })

    const caption = computed(() => {
      if (isReconcileToBeScheduled.value) {
        return 'Requesting to schedule cluster reconcile'
      } else if (isShootReconciliationDeactivated.value) {
        return 'Reconciliation deactivated for this cluster'
      }
      return buttonTitle.value
    })

    const buttonTitle = computed(() => {
      return 'Trigger Reconcile'
    })

    const buttonText = computed(() => {
      return !props.text
        ? ''
        : buttonTitle.value
    })

    const lastOperationFailed = computed(() => {
      return get(shootLastOperation.value, 'state') === 'Failed'
    })

    const appStore = useAppStore()

    watch(isReconcileToBeScheduled, value => {
      const isReconcileScheduled = !value && reconcileTriggered.value
      if (!isReconcileScheduled) {
        return
      }
      reconcileTriggered.value = false
      currentGeneration.value = null

      if (!shootName.value) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      appStore.setSuccess(`Reconcile triggered for ${shootName.value}`)
    })

    return {
      shootNamespace,
      shootName,
      shootGeneration,
      isShootReconciliationDeactivated,
      shootLastOperation,
      reconcileTriggered,
      currentGeneration,
      isReconcileToBeScheduled,
      caption,
      buttonTitle,
      buttonText,
      lastOperationFailed,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.startReconcile()
      }
    },
    async startReconcile () {
      this.reconcileTriggered = true
      this.currentGeneration = this.shootGeneration
      try {
        await this.api.addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            'gardener.cloud/operation': this.lastOperationFailed
              ? 'retry'
              : 'reconcile',
          },
        })
      } catch (err) {
        const errorMessage = 'Could not trigger reconcile'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog?.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.reconcileTriggered = false
        this.currentGeneration = null
      }
    },
  },
}
</script>
