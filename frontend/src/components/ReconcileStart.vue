<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shootItem="shootItem"
    :loading="isReconcileToBeScheduled"
    @dialogOpened="startDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    maxWidth="600"
    :buttonText="buttonText"
    confirmButtonText="Trigger now"
    :disabled="isShootReconciliationDeactivated">
    <template v-slot:actionComponent>
      <v-row >
        <v-col>
          <div class="subtitle-1 pt-4">Do you want to trigger a reconcile of your cluster outside of the regular reconciliation schedule?<br />
          </div>
        </v-col>
      </v-row>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import { addShootAnnotation } from '@/utils/api'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    ActionButtonDialog
  },
  props: {
    shootItem: {
      type: Object
    },
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
    }
  },
  methods: {
    async startDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.startReconcile()
      }
    },
    async startReconcile () {
      this.reconcileTriggered = true
      this.currentGeneration = get(this.shootItem, 'metadata.generation')

      const reconcile = { 'gardener.cloud/operation': 'reconcile' }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: reconcile })
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

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
        return
      }

      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.success(`Reconcile triggered for ${this.shootName}`, config)
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
