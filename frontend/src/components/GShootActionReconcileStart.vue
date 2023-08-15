<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-shoot-action-dialog
    v-if="dialog"
    ref="actionDialog"
    :shoot-item="shootItem"
    :caption="caption"
    confirm-button-text="Trigger now"
    width="600"
  >
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
  </g-shoot-action-dialog>
  <g-shoot-action-button
    v-if="button"
    ref="actionButton"
    :shoot-item="shootItem"
    :loading="isReconcileToBeScheduled"
    :disabled="isShootReconciliationDeactivated"
    icon="mdi-refresh"
    :text="buttonText"
    :caption="caption"
    @click="internalValue = true"
  />
</template>

<script>
import { mapActions } from 'pinia'

import { useAppStore } from '@/store/app'

import GShootActionButton from '@/components/GShootActionButton.vue'
import GShootActionDialog from '@/components/GShootActionDialog.vue'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

import { get } from '@/lodash'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
  },
  mixins: [shootItem],
  inject: ['api', 'logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    text: {
      type: Boolean,
      default: false,
    },
    dialog: {
      type: Boolean,
      default: false,
    },
    button: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      reconcileTriggered: false,
      currentGeneration: null,
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    isReconcileToBeScheduled () {
      return this.shootGenerationValue === this.currentGeneration
    },
    caption () {
      if (this.isReconcileToBeScheduled) {
        return 'Requesting to schedule cluster reconcile'
      } else if (this.isShootReconciliationDeactivated) {
        return 'Reconciliation deactivated for this cluster'
      }
      return this.buttonTitle
    },
    buttonTitle () {
      return 'Trigger Reconcile'
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    },
    lastOperationFailed () {
      return get(this.shootLastOperation, 'state') === 'Failed'
    },
  },
  watch: {
    modelValue (value) {
      if (this.dialog) {
        const actionDialog = this.$refs.actionDialog
        if (value) {
          actionDialog.showDialog()
          this.waitForConfirmation()
        } else {
          actionDialog.hideDialog()
        }
      }
    },
    isReconcileToBeScheduled (reconcileToBeScheduled) {
      const isReconcileScheduled = !reconcileToBeScheduled && this.reconcileTriggered
      if (!isReconcileScheduled) {
        return
      }
      this.reconcileTriggered = false
      this.currentGeneration = null

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      this.setAlert({
        message: `Reconcile triggered for ${this.shootName}`,
      })
    },
  },
  methods: {
    ...mapActions(useAppStore, [
      'setAlert',
    ]),
    waitForConfirmation () {
      this.$nextTick(async () => {
        const actionDialog = this.$refs.actionDialog
        try {
          if (await actionDialog.waitForDialogClosed()) {
            this.startReconcile()
          }
        } catch (err) {
          /* ignore error */
        } finally {
          this.internalValue = false
        }
      })
    },
    async startReconcile () {
      this.reconcileTriggered = true
      this.currentGeneration = get(this.shootItem, 'metadata.generation')

      const operation = this.lastOperationFailed ? 'retry' : 'reconcile'
      const annotation = { 'gardener.cloud/operation': operation }
      try {
        await this.api.addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: annotation })
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
@/lodash
