<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

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
    :tooltip="tooltip"
    :icon ="icon"
    width="700"
    :button-text="componentTexts.buttonText"
    :confirm-required="true"
    :confirm-button-text="confirmButtonText">
    <template v-slot:actionComponent>
      <v-row >
        <v-col>
          <div class="py-4 text-h5 pt-0 pb-3">{{componentTexts.heading}}</div>
          <v-alert v-if="mode === 'start'" type="info" outlined dense>Note: This is a two-phase operation. This step will <strong>prepare</strong> the rotation. Please read below which actions will be performed in this phase.</v-alert>
          <v-alert v-if="mode === 'complete'" type="info" outlined dense>Note: This is a two-phase operation. This step will <strong>complete</strong> the rotation. Please read below which actions will be performed in this phase.</v-alert>
          <ul :class="{'no-bullets' : componentTexts.messages.length === 1}">
            <li
              v-for="message in componentTexts.messages"
              class="font-weight-bold"
              :key="message">
              {{message}}
            </li>
          </ul>
          <v-checkbox
            v-model="maintenance"
            label="Perform this operation in the maintenance time window"
            :disabled="isMaintenanceDisabled"
            :hint="maintenanceHint"
            persistent-hint>
          </v-checkbox>
          <div class="mt-3">Type <span class="font-weight-bold">{{shootName}}</span> below to confirm the operation.</div>
        </v-col>
      </v-row>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog'
import { addShootAnnotation } from '@/utils/api'
import { rotationTypes } from '@/utils/credentialsRotation'
import { SnotifyPosition } from 'vue-snotify'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'
import { mapGetters } from 'vuex'
import includes from 'lodash/includes'
import get from 'lodash/get'

export default {
  name: 'rotate-credentials',
  components: {
    ActionButtonDialog
  },
  props: {
    text: {
      type: Boolean
    },
    type: {
      type: String,
      required: false
    }
  },
  data () {
    return {
      actionTriggered: false,
      maintenance: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    mode () {
      if (!this.completionOperation) {
        return 'rotate'
      }
      if (this.operation === this.completionOperation) {
        return 'complete'
      }
      return 'start'
    },
    operation () {
      if (this.phaseType === 'Prepared' || this.phaseType === 'Completing') {
        return this.completionOperation
      }
      return this.startOperation
    },
    startOperation () {
      if (rotationTypes[this.type]) {
        return rotationTypes[this.type].startOperation
      }
      return rotationTypes.allCredentials.startOperation
    },
    completionOperation () {
      if (rotationTypes[this.type]) {
        return rotationTypes[this.type].completionOperation
      }
      return rotationTypes.allCredentials.completionOperation
    },
    rotationStatus () {
      return get(this.shootStatusCredentialsRotation, this.type, {})
    },
    phase () {
      if (this.type === 'allCredentials') {
        return this.shootStatusCredentialsRotationAggregatedPhase
      }
      return this.rotationStatus.phase
    },
    phaseType () {
      if (typeof this.phase === 'object') {
        return get(this.phase, 'type')
      }
      return this.phase
    },
    isActionToBeScheduled () {
      return this.shootGardenOperation === this.operation
    },
    isProgressingPhase () {
      if (this.mode === 'start' && this.phaseType === 'Preparing') {
        return true
      }
      if (this.mode === 'complete' && this.phaseType === 'Completing') {
        return true
      }
      return false
    },
    isLoading () {
      if (this.isActionToBeScheduled) {
        return true
      }
      if (this.isScheduled) {
        return true
      }
      if (this.isProgressingPhase && this.type !== 'allCredentials') {
        // Only show the loading indicator for the rotation that is actually running, not for the overall trigger button
        return true
      }
      return false
    },
    isDisabled () {
      if (this.phase && this.phase.incomplete) {
        return true
      }
      if (this.isHibernationPreventingRotation) {
        return true
      }
      if (this.isScheduledOperation) {
        return true
      }
      if (this.isProgressingPhase) {
        return true
      }
      return false
    },
    isScheduledForMaintenance () {
      return this.shootAnnotations['maintenance.gardener.cloud/operation'] === this.operation
    },
    isScheduled () {
      return this.shootAnnotations['gardener.cloud/operation'] === this.operation
    },
    isScheduledOperation () {
      return !!this.shootAnnotations['gardener.cloud/operation']
    },
    isMaintenanceDisabled () {
      return !this.isScheduledForMaintenance && !!this.shootAnnotations['maintenance.gardener.cloud/operation']
    },
    maintenanceHint () {
      if (this.isMaintenanceDisabled) {
        return 'Another operation has already been scheduled. Only one operation at a time can be scheduled.'
      }
      return ''
    },
    isHibernationPreventingRotation () {
      return this.isShootStatusHibernated &&
        includes(['rotate-credentials-start',
          'rotate-etcd-encryption-key-start',
          'rotate-credentials-complete',
          'rotate-etcd-encryption-key-complete',
          'rotate-serviceaccount-key-start',
          'rotate-serviceaccount-key-complete'],
        this.operation)
    },
    icon () {
      if (this.isScheduledForMaintenance) {
        return 'mdi-clock-outline'
      }
      return 'mdi-refresh'
    },
    confirmButtonText () {
      if (this.isScheduledForMaintenance && !this.maintenance) {
        return 'Unschedule Rotation'
      }
      if (this.maintenance) {
        return 'Schedule Roatation'
      }
      switch (this.mode) {
        case 'start':
          return 'Prepare Roatation'
        case 'complete':
          return 'Complete Rotation'
      }
      return 'Rotate'
    },
    tooltip () {
      if (this.isScheduledForMaintenance) {
        return 'This operation is scheduled to be performed during the next maintenance time window'
      }
      if (this.isHibernationPreventingRotation && this.isShootStatusHibernated) {
        return 'Cluster is hibernated. Wake up cluster to perform this operation'
      }
      if (this.phase && this.phase.incomplete) {
        return 'Operation is disabled because all two-phase operations need to be in the same phase'
      }
      if (this.isScheduledOperation) {
        return 'There is alread an operation scheduled for this cluster'
      }
      if (this.isProgressingPhase && this.type === 'allCredentials') {
        return 'A rotation operation is currently running'
      }
      return undefined
    },
    componentTexts () {
      const componentTexts = {
        'rotate-kubeconfig-credentials': {
          caption: this.isLoading ? 'Scheduling kubeconfig credentials rotation' : 'Start Kubeconfig Rotation',
          errorMessage: 'Could not start the rotation of kubeconfig credentials',
          successMessage: `Rotation of kubeconfig credentials started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of kubeconfig credentials?',
          messages: [
            'The current kubeconfig credentials will be revoked.'
          ]
        },
        'rotate-ca-start': {
          caption: this.isLoading
            ? 'Preparing certificate authorities rotation'
            : 'Prepare Certificate Authorities Rotation',
          errorMessage: 'Could not prepare the rotation of certificate authorities',
          successMessage: `Rotation of certificate authorities prepared for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of certificate authorities?',
          messages: [
            'New Certificate Authorities will be created and added to the bundle (together with the old Certificate Authorities).'
          ]
        },
        'rotate-ca-complete': {
          caption: this.isLoading
            ? 'Completing certificate authorities rotation'
            : 'Complete Certificate Authorities Rotation',
          errorMessage: 'Could not complete the rotation of certificate authorities',
          successMessage: `Rotation of certificate authorities completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of certificate authorities?',
          messages: [
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their kubeconfig for this Shoot cluster since the Certificate Authorities rotation was last initiated. Otherwise the client requests will fail as the old Certificate Authorities will be dropped from the bundle.'
          ]
        },
        'rotate-observability-credentials': {
          caption: this.isLoading ? 'Scheduling observability passwords rotation' : 'Start Observability Passwords Rotation',
          errorMessage: 'Could not start the rotation of observability passwords',
          successMessage: `Rotation of observability passwords started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of observability passwords?',
          messages: [
            this.isAdmin
              ? 'Note Operator: This will invalidate the user observability passwords. Operator passwords will be rotated automatically. There is no way to trigger the rotation manually.'
              : 'The current observability passwords will be invalidated.'
          ]
        },
        'rotate-ssh-keypair': {
          caption: this.isLoading ? 'Scheduling SSH key pair rotation' : 'Start Worker Nodes SSH Key Pair Rotation',
          errorMessage: 'Could not start the rotation of SSH key pair',
          successMessage: `Rotation of SSH key pair started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of SSH key pair for worker nodes?',
          messages: [
            'The current SSH key pair will be revoked.'
          ]
        },
        'rotate-etcd-encryption-key-start': {
          caption: this.isLoading
            ? 'Preparing etcd encryption key rotation'
            : 'Prepare ETCD Encryption Key Rotation',
          errorMessage: 'Could not prepare the rotation of etcd encryption key',
          successMessage: `Rotation of etcd encryption key prepared for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of etcd encryption key?',
          messages: [
            'A new encryption key will be created and added to the bundle (together with the old encryption key). All Secrets in the cluster will be rewritten by the kube-apiserver so that they become encrypted with the new encryption key.'
          ]
        },
        'rotate-etcd-encryption-key-complete': {
          caption: this.isLoading
            ? 'Completing etcd encryption key rotation'
            : 'Complete ETCD Encryption Key Rotation',
          errorMessage: 'Could not complete the rotation of etcd encryption key',
          successMessage: `Rotation of etcd encryption key completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of etcd encryption key?',
          messages: [
            'The old encryption will be dropped from the bundle.'
          ]
        },
        'rotate-serviceaccount-key-start': {
          caption: this.isLoading
            ? 'Preparing ServiceAccount token signing key rotation'
            : 'Prepare ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not prepare the rotation of ServiceAccount token signing key',
          successMessage: `Rotation of ServiceAccount token signing key prepared for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of ServiceAccount token signing key?',
          messages: [
            'A new signing key will be created and added to the bundle (together with the old signing key)'
          ]
        },
        'rotate-serviceaccount-key-complete': {
          caption: this.isLoading
            ? 'Completing ServiceAccount token signing key rotation'
            : 'Complete ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not complete the rotation of ServiceAccount token signing key',
          successMessage: `Rotation of ServiceAccount token signing key completed for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of ServiceAccount token signing key?',
          messages: [
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their ServiceAccount kubeconfigs for this Shoot cluster. Otherwise the client requests will fail as the old signing key will be dropped from the bundle.'
          ]
        }
      }
      componentTexts['rotate-credentials-start'] = {
        caption: this.isLoading
          ? 'Preparing credential rotation'
          : 'Start Rotation of all Credentials',
        buttonText: this.text ? 'Prepare Rotation of all Credentials' : '',
        errorMessage: 'Could not prepare credential rotation',
        successMessage: `Credential rotation prepared for ${this.shootName}`,
        heading: 'Do you want to prepare the rotation of all credentials?',
        messages: [
          ...componentTexts['rotate-kubeconfig-credentials'].messages,
          ...componentTexts['rotate-ca-start'].messages,
          ...componentTexts['rotate-observability-credentials'].messages,
          ...componentTexts['rotate-ssh-keypair'].messages,
          ...componentTexts['rotate-etcd-encryption-key-start'].messages,
          ...componentTexts['rotate-serviceaccount-key-start'].messages
        ]
      }
      componentTexts['rotate-credentials-complete'] = {
        caption: this.isLoading
          ? 'Completing credential rotation'
          : 'Complete Rotation of all Credentials',
        buttonText: this.text ? 'Complete Rotation of all Credentials' : '',
        errorMessage: 'Could not complete credential rotation',
        successMessage: `Credential rotation completed for ${this.shootName}`,
        heading: 'Do you want to complete the rotation of all credentials?',
        messages: [
          ...componentTexts['rotate-ca-complete'].messages,
          ...componentTexts['rotate-etcd-encryption-key-complete'].messages,
          ...componentTexts['rotate-serviceaccount-key-complete'].messages
        ]
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

      let data
      if (this.maintenance) {
        data = { 'maintenance.gardener.cloud/operation': this.operation }
      } else if (this.isScheduledForMaintenance) {
        // remove annotation if this operation was scheduled for maintenance
        data = { 'maintenance.gardener.cloud/operation': null }
      } else {
        data = { 'gardener.cloud/operation': this.operation }
      }
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
  },
  mounted () {
    this.maintenance = this.isScheduledForMaintenance
  }
}
</script>

<style lang="scss" scoped>
  .no-bullets {
    padding: 0px;
    list-style-type: none;
  }
</style>
