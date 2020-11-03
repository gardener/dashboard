<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shootItem="shootItem"
    :loading="isActionToBeScheduled"
    @dialogOpened="startDialogOpened"
    ref="actionDialog"
    :caption="caption"
    icon="mdi-refresh"
    maxWidth="600"
    :buttonText="buttonText"
    :confirmRequired="true"
    confirmButtonText="Rotate">
    <template v-slot:actionComponent>
      <v-row >
        <v-col>
          <div class="py-4">Do you want to start rotation of kubeconfig credentials?
          </div>
          <v-alert dense color="warning" icon="mdi-exclamation-thick" outlined>
            The current kubeconfig credentials will be revoked.
          </v-alert>
          <div class="pt-4">Type <strong>{{shootName}}</strong> below and confirm revokation of current kubeconfig credentials.
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
      actionTriggered: false
    }
  },
  mixins: [shootItem],
  computed: {
    isActionToBeScheduled () {
      return this.shootGardenOperation === 'rotate-kubeconfig-credentials'
    },
    caption () {
      if (this.isActionToBeScheduled) {
        return 'Requesting to schedule kubeconfig credentials rotation'
      }
      return this.buttonTitle
    },
    buttonTitle () {
      return 'Start Kubeconfig Rotation'
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return 'Rotate Kubeconfig'
    }
  },
  methods: {
    async startDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.start()
      }
    },
    async start () {
      this.actionTriggered = true

      const data = { 'gardener.cloud/operation': 'rotate-kubeconfig-credentials' }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data })
      } catch (err) {
        const errorMessage = 'Could not start rotation of kubeconfig credentials'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)

        this.actionTriggered = false
      }
    }
  },
  watch: {
    isActionToBeScheduled (actionToBeScheduled) {
      const isActionScheduled = !actionToBeScheduled && this.actionTriggered
      if (!isActionScheduled) {
        return
      }
      this.actionTriggered = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource beeing cleared (e.g. during navigation)
        return
      }
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.success(`Rotation of kubeconfig credentials started for ${this.shootName}`, config)
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
