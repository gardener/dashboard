<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :loading="isLoading"
    :disabled="isDisabled"
    @dialog-opened="startDialogOpened"
    ref="actionDialog"
    :caption="componentTexts.caption"
    :icon="icon"
    width="600"
    :button-text="componentTexts.buttonText"
    :confirm-required="true"
    :confirm-button-text="confirmButtonText">
    <template v-slot:actionComponent>
      <v-row >
        <v-col>
          <span class="py-4">{{componentTexts.heading}}</span>
          <v-alert :type="componentTexts.alert.type" outlined>
            <ul class="pa-0">
              <li
                v-for="message in componentTexts.alert.messages"
                :class="{'no-bullets' : componentTexts.alert.messages.length === 1}"
                :key="message">
                {{message}}
              </li>
            </ul>
          </v-alert>
          <span class="pt-4">Type <span class="font-weight-bold">{{shootName}}</span> below top confirm the operation.</span>
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
import { mapGetters } from 'vuex'

export default {
  components: {
    ActionButtonDialog
  },
  props: {
    text: {
      type: Boolean
    },
    operation: {
      type: String,
      required: true
    },
    phase: {
      type: String,
      required: false
    },
    mode: {
      type: String,
      default: 'rotate'
    }
  },
  data () {
    return {
      actionTriggered: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    isActionToBeScheduled () {
      return this.shootGardenOperation === this.operation
    },
    isLoading () {
      if (this.isActionToBeScheduled) {
        return true
      }
      if (this.mode === 'init' && this.phase === 'Preparing') {
        return true
      }
      if (this.mode === 'complete' && this.phase === 'Completing') {
        return true
      }
      return false
    },
    isDisabled () {
      if (this.mode === 'complete' && this.phase !== 'Prepared') {
        return true
      }
      if (this.mode === 'init' && this.phase && this.phase !== 'Completed') {
        return true
      }
      return false
    },
    icon () {
      switch (this.mode) {
        case 'init':
          return 'mdi-rotate-right'
      }
      return 'mdi-refresh'
    },
    confirmButtonText () {
      switch (this.mode) {
        case 'init':
          return 'Initiate Roatation'
        case 'complete':
          return 'Complete Rotation'
      }
      return 'Rotate'
    },
    componentTexts () {
      const componentTexts = {
        'rotate-kubeconfig-credentials': {
          caption: this.isActionToBeScheduled ? 'Requesting to schedule kubeconfig credentials rotation' : 'Start Kubeconfig Rotation',
          errorMessage: 'Could not start the rotation of kubeconfig credentials',
          successMessage: `Rotation of kubeconfig credentials started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of kubeconfig credentials?',
          alert: {
            type: 'warning',
            messages: [
              'The current kubeconfig credentials will be revoked.'
            ]
          }
        },
        'rotate-ca-start': {
          caption: this.isActionToBeScheduled
            ? 'Requesting to initiate certificate authorities rotation'
            : this.isDisabled
              ? 'Rotation already initiated'
              : 'Initiate Certificate Authorities Rotation',
          errorMessage: 'Could not initiate the rotation of certificate authorities',
          successMessage: `Rotation of certificate authorities initiated for ${this.shootName}`,
          heading: 'Do you want to initiate the rotation of certificate authorities?',
          alert: {
            type: 'info',
            messages: [
              'New CAs will be created and added to the bundle (together with the old CAs). Client certificates will be re-issued immediately.'
            ]
          }
        },
        'rotate-ca-complete': {
          caption: this.isLoading
            ? 'Completing certificate authorities rotation'
            : this.isDisabled
              ? 'Rotation initiation not completed'
              : 'Complete Certificate Authorities Rotation',
          errorMessage: 'Could not complete the rotation of certificate authorities',
          successMessage: `Rotation of certificate authorities completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of certificate authorities?',
          alert: {
            type: 'warning',
            messages: [
              'Ensure that end-users have updated all cluster API clients that communicate with the control plane. The old CAs will be dropped from the bundle and server certificate will be re-issued.'
            ]
          }
        },
        'rotate-observability-credentials': {
          caption: this.isActionToBeScheduled ? 'Requesting to schedule observability passwords rotation' : 'Start Observability Passwords Rotation',
          errorMessage: 'Could not start the rotation of observability passwords',
          successMessage: `Rotation of observability passwords started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of observability passwords?',
          alert: {
            type: 'warning',
            messages: [
              this.isAdmin
                ? 'Note Operator: This will invalidate the user observability passwords. Operator passwords will be rotated automatically. There is no way to trigger the rotation manually.'
                : 'The current observability passwords will be invalidated.'
            ]
          }
        },
        'rotate-ssh-keypair': {
          caption: this.isActionToBeScheduled ? 'Requesting to schedule ssh key pair rotation' : 'Start Worker Nodes SSH Key Pair Rotation',
          errorMessage: 'Could not start the rotation of ssh key pair',
          successMessage: `Rotation of ssh key pair started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of ssh key pair for worker nodes?',
          alert: {
            type: 'warning',
            messages: [
              'The current ssh key pair will be revoked.'
            ]
          }
        },
        'rotate-etcd-encryption-key-start': {
          caption: this.isActionToBeScheduled
            ? 'Requesting to initiate etcd encryption key rotation'
            : this.isDisabled
              ? 'Rotation already initiated'
              : 'Initiate ETCD Encryption Key Rotation',
          errorMessage: 'Could not initiate the rotation of etcd encryption key',
          successMessage: `Rotation of etcd encryption key initiated for ${this.shootName}`,
          heading: 'Do you want to initiate the rotation of etcd encryption key?',
          alert: {
            type: 'info',
            messages: [
              'A new encryption key will be created and added to the bundle (together with the old encryption key). All Secrets in the cluster will be rewritten by the kube-apiserver so that they become encrypted with the new encryption key.'
            ]
          }
        },
        'rotate-etcd-encryption-key-complete': {
          caption: this.isLoading
            ? 'Completing etcd encryption key rotation'
            : this.isDisabled
              ? 'Rotation initiation not completed'
              : 'Complete ETCD Encryption Key Rotation',
          errorMessage: 'Could not complete the rotation of etcd encryption key',
          successMessage: `Rotation of etcd encryption key completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of etcd encryption key?',
          alert: {
            type: 'warning',
            messages: [
              'The old encryption will be dropped from the bundle.'
            ]
          }
        },
        'rotate-serviceaccount-key-start': {
          caption: this.isActionToBeScheduled
            ? 'Requesting to initiate ServiceAccount token signing key rotation'
            : this.isDisabled
              ? 'Rotation already initiated'
              : 'Initiate ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not initiate the rotation of ServiceAccount token signing key',
          successMessage: `Rotation of ServiceAccount token signing key initiated for ${this.shootName}`,
          heading: 'Do you want to initiate the rotation of ServiceAccount token signing key?',
          alert: {
            type: 'info',
            messages: [
              'A new signing key will be created and added to the bundle (together with the old signing key)'
            ]
          }
        },
        'rotate-serviceaccount-key-complete': {
          caption: this.isLoading
            ? 'Completing ServiceAccount token signing key rotation'
            : this.isDisabled
              ? 'Rotation initiation not completed'
              : 'Complete ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not complete the rotation of ServiceAccount token signing key',
          successMessage: `Rotation of ServiceAccount token signing key completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of ServiceAccount token signing key?',
          alert: {
            type: 'warning',
            messages: [
              'Ensure that end-users have updated all out-of-cluster API clients that communicate with the control plane via ServiceAccount tokens. The old signing key will be dropped from the bundle.'
            ]
          }
        }
      }
      componentTexts['rotate-credentials-start'] = {
        caption: this.isActionToBeScheduled
          ? 'Requesting to initiate credential rotation'
          : this.isDisabled
            ? 'All credentials rotations need to have reached phase "Completed" in order to perform tis action. Please complete all credential rotations that have already been initiated.'
            : 'Initiate Rotation of all Credentials',
        buttonText: this.text ? 'Initiate Rotation of all Credentials' : '',
        errorMessage: 'Could not initiate credential rotation',
        successMessage: `Credential rotation initiated for ${this.shootName}`,
        heading: 'Do you want to initiate the rotation of all credentials?',
        alert: {
          type: 'warning',
          messages: [
            ...componentTexts['rotate-kubeconfig-credentials'].alert.messages,
            ...componentTexts['rotate-ca-start'].alert.messages,
            ...componentTexts['rotate-observability-credentials'].alert.messages,
            ...componentTexts['rotate-ssh-keypair'].alert.messages,
            ...componentTexts['rotate-etcd-encryption-key-start'].alert.messages,
            ...componentTexts['rotate-serviceaccount-key-start'].alert.messages
          ]
        }
      }
      componentTexts['rotate-credentials-complete'] = {
        caption: this.isLoading
          ? 'Completing credential rotation'
          : this.isDisabled
            ? 'All credentials rotations need to have reached phase "Prepared" in order to perform this action. Ensure that you have triggered the rotation initiation for all required credentials.'
            : 'Complete Rotation of all Credentials',
        buttonText: this.text ? 'Complete Rotation of all Credentials' : '',
        errorMessage: 'Could not complete credential rotation',
        successMessage: `Credential rotation completed for ${this.shootName}`,
        heading: 'Do you want to complete the rotation of all credentials?',
        alert: {
          type: 'warning',
          messages: [
            ...componentTexts['rotate-ca-complete'].alert.messages,
            ...componentTexts['rotate-etcd-encryption-key-complete'].alert.messages,
            ...componentTexts['rotate-serviceaccount-key-complete'].alert.messages
          ]
        }
      }
      return componentTexts[this.operation]
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

      const data = { 'gardener.cloud/operation': this.operation }
      try {
        await addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data })
      } catch (err) {
        const errorMessage = this.componentTexts.errorMessage
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
      this.$snotify.success(this.componentTexts.successMessage, config)
    }
  }
}
</script>

<style lang="scss" scoped>
  .no-bullets {
    list-style-type: none;
  }
</style>
