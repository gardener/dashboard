<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :loading="isReconcileToBeScheduled"
    @dialog-opened="startDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    width="600"
    :button-text="buttonText"
    confirm-button-text="Trigger now"
    :disabled="isShootReconciliationDeactivated">
    <template v-slot:actionComponent>
      <v-row>
        <v-col class="text-subtitle-1">Do you want to trigger a reconcile of your cluster outside of the regular reconciliation schedule?</v-col>
      </v-row>
      <v-row v-if="lastOperationFailed">
        <v-col class="text-subtitle-1">Note: For clusters in failed state this will retry the operation.</v-col>
      </v-row>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import { addShootAnnotation } from '@/utils/api'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'
import { mapActions } from 'vuex'

export default {
  components: {
    ActionButtonDialog
  },
  props: {
    text: {
      type: Boolean
    }
  },
  data () {
    return {
      reconcileTriggered: false,
      currentGeneration: null
    }
  },
  mixins: [shootItem],
  computed: {
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
    }
  },
  methods: {
    ...mapActions([
      'setAlert'
    ]),
    async startDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.startReconcile()
      }
    },
    async startReconcile () {
      this.reconcileTriggered = true
      this.currentGeneration = get(this.shootItem, 'metadata.generation')

      const operation = this.lastOperationFailed ? 'retry' : 'reconcile'
      const annotation = { 'gardener.cloud/operation': operation }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: annotation })
      } catch (err) {
        const errorMessage = 'Could not trigger reconcile'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.reconcileTriggered = false
        this.currentGeneration = null
      }
    }
  },
  watch: {
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
        message: `Reconcile triggered for ${this.shootName}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  .progress-icon {
    font-size: 15px;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
