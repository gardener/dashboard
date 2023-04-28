<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    :loading="showLoadingIndicator"
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
          <v-alert v-if="mode === 'START'" type="info" variant="outlined" dense>Note: This rotation operation is split into two steps. This step will <strong>prepare</strong> the rotation.</v-alert>
          <v-alert v-if="mode === 'COMPLETE'" type="info" variant="outlined" dense>Note: This rotation operation is split into two steps. This step will <strong>complete</strong> the rotation.</v-alert>
          <strong>Actions performed in this step</strong>
          <ul>
            <li
              v-for="action in componentTexts.actions"
              :key="action">
              {{action}}
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
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import { addShootAnnotation } from '@/utils/api'
import shootStatusCredentialRotation from '@/mixins/shootStatusCredentialRotation'
import { errorDetailsFromError } from '@/utils/error'
import { mapGetters, mapActions } from 'vuex'
import includes from 'lodash/includes'
import compact from 'lodash/compact'

export default {
  name: 'rotate-credentials',
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
      actionTriggered: false,
      maintenance: false
    }
  },
  mixins: [shootStatusCredentialRotation],
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    mode () {
      if (!this.completionOperation) {
        return 'ROTATE'
      }
      if (this.operation === this.completionOperation) {
        return 'COMPLETE'
      }
      return 'START'
    },
    operation () {
      if (this.phaseType === 'Prepared' || this.phaseType === 'Completing') {
        return this.completionOperation
      }
      return this.startOperation
    },
    startOperation () {
      return this.rotationType.startOperation
    },
    completionOperation () {
      return this.rotationType.completionOperation
    },
    isActionToBeScheduled () {
      return this.shootGardenOperation === this.operation
    },
    isProgressing () {
      if (this.mode === 'START' && this.phaseType === 'Preparing') {
        return true
      }
      if (this.mode === 'COMPLETE' && this.phaseType === 'Completing') {
        return true
      }
      if (!this.rotationType.twoStep && this.phaseType === 'Rotating') {
        return true
      }
      return false
    },
    showLoadingIndicator () {
      if (this.isActionToBeScheduled) {
        return true
      }
      if (this.isScheduled) {
        return true
      }
      if (this.isProgressing && this.type !== 'ALL_CREDENTIALS') {
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
      if (this.isProgressing) {
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
        case 'START':
          return 'Prepare Roatation'
        case 'COMPLETE':
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
        return 'Operation is disabled because all two-step operations need to be in the same phase'
      }
      if (!this.showLoadingIndicator && this.isScheduledOperation) {
        return 'There is already an operation scheduled for this cluster'
      }
      if (this.showLoadingIndicator && this.type === 'ALL_CREDENTIALS') {
        return 'A rotation operation is currently running'
      }
      return undefined
    },
    componentTexts () {
      const componentTexts = {
        'rotate-kubeconfig-credentials': {
          caption: this.showLoadingIndicator
            ? 'Rotating kubeconfig credentials'
            : 'Start Kubeconfig Rotation',
          errorMessage: 'Could not start the rotation of kubeconfig credentials',
          successMessage: `Rotation of kubeconfig credentials started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of kubeconfig credentials?',
          actions: [
            'The current kubeconfig credentials will be revoked',
            'New kubeconfig credentials will be generated'
          ]
        },
        'rotate-ca-start': {
          caption: this.showLoadingIndicator
            ? 'Preparing certificate authorities rotation'
            : 'Prepare Certificate Authorities Rotation',
          errorMessage: 'Could not prepare the rotation of certificate authorities',
          successMessage: `Preparing rotation of certificate authorities for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of certificate authorities?',
          actions: [
            'New Certificate Authorities will be created and added to the bundle (old Certificate Authorities will remain in the bundle)'
          ]
        },
        'rotate-ca-complete': {
          caption: this.showLoadingIndicator
            ? 'Completing certificate authorities rotation'
            : 'Complete Certificate Authorities Rotation',
          errorMessage: 'Could not complete the rotation of certificate authorities',
          successMessage: `Completing rotation of certificate authorities for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of certificate authorities?',
          actions: [
            'Old Certificate Authorities will be dropped from the bundle',
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their kubeconfig for this Shoot cluster since the rotation was prepared. Otherwise the client requests will fail as the old Certificate Authorities will be dropped from the bundle'
          ]
        },
        'rotate-observability-credentials': {
          caption: this.showLoadingIndicator
            ? 'Rotating observability passwords'
            : 'Start Observability Passwords Rotation',
          errorMessage: 'Could not start the rotation of observability passwords',
          successMessage: `Rotation of observability passwords started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of observability passwords?',
          actions: compact([
            'The current observability passwords will be invalidated',
            'New observability passwords will be generated',
            this.isAdmin
              ? 'Note Operator: This will invalidate the user observability passwords. Operator passwords will be rotated automatically. There is no way to trigger the rotation manually'
              : undefined
          ])
        },
        'rotate-ssh-keypair': {
          caption: this.showLoadingIndicator
            ? 'Rotating SSH key pair'
            : 'Start Worker Nodes SSH Key Pair Rotation',
          errorMessage: 'Could not start the rotation of SSH key pair',
          successMessage: `Rotation of SSH key pair started for ${this.shootName}`,
          heading: 'Do you want to start the rotation of SSH key pair for worker nodes?',
          actions: [
            'The current SSH key pair will be revoked.',
            'A new SSH key pair will be generated'
          ]
        },
        'rotate-etcd-encryption-key-start': {
          caption: this.showLoadingIndicator
            ? 'Preparing etcd encryption key rotation'
            : 'Prepare ETCD Encryption Key Rotation',
          errorMessage: 'Could not prepare the rotation of etcd encryption key',
          successMessage: `Preparing rotation of etcd encryption key for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of etcd encryption key?',
          actions: [
            'A new encryption key will be created and added to the bundle (old encryption key will remain in the bundle).',
            'All Secrets in the cluster will be rewritten by the kube-apiserver so that they become encrypted with the new encryption key.'
          ]
        },
        'rotate-etcd-encryption-key-complete': {
          caption: this.showLoadingIndicator
            ? 'Completing etcd encryption key rotation'
            : 'Complete ETCD Encryption Key Rotation',
          errorMessage: 'Could not complete the rotation of etcd encryption key',
          successMessage: `Completing rotation of etcd encryption key for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of etcd encryption key?',
          actions: [
            'The old encryption will be dropped from the bundle.'
          ]
        },
        'rotate-serviceaccount-key-start': {
          caption: this.showLoadingIndicator
            ? 'Preparing ServiceAccount token signing key rotation'
            : 'Prepare ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not prepare the rotation of ServiceAccount token signing key',
          successMessage: `Preparing rotation of ServiceAccount token signing key for ${this.shootName}`,
          heading: 'Do you want to prepare the rotation of ServiceAccount token signing key?',
          actions: [
            'A new signing key will be created and added to the bundle (old signing key will remain in the bundle)'
          ]
        },
        'rotate-serviceaccount-key-complete': {
          caption: this.showLoadingIndicator
            ? 'Completing ServiceAccount token signing key rotation'
            : 'Complete ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not complete the rotation of ServiceAccount token signing key',
          successMessage: `Completing rotation of ServiceAccount token signing key for ${this.shootName}`,
          heading: 'Do you want to complete the rotation of ServiceAccount token signing key?',
          actions: [
            'Old signing key will be dropped from the bundle',
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their ServiceAccount kubeconfigs for this Shoot cluster since the rotation was prepared. Otherwise the client requests will fail as the old signing key will be dropped from the bundle'
          ]
        }
      }
      componentTexts['rotate-credentials-start'] = {
        caption: this.showLoadingIndicator
          ? 'Preparing credential rotation'
          : 'Start Rotation of all Credentials',
        buttonText: this.text ? 'Prepare Rotation of all Credentials' : '',
        errorMessage: 'Could not prepare credential rotation',
        successMessage: `Preparing credential rotation for ${this.shootName}`,
        heading: 'Do you want to prepare the rotation of all credentials?',
        actions: [
          ...componentTexts['rotate-kubeconfig-credentials'].actions,
          ...componentTexts['rotate-ca-start'].actions,
          ...componentTexts['rotate-observability-credentials'].actions,
          ...componentTexts['rotate-ssh-keypair'].actions,
          ...componentTexts['rotate-etcd-encryption-key-start'].actions,
          ...componentTexts['rotate-serviceaccount-key-start'].actions
        ]
      }
      componentTexts['rotate-credentials-complete'] = {
        caption: this.showLoadingIndicator
          ? 'Completing credential rotation'
          : 'Complete Rotation of all Credentials',
        buttonText: this.text
          ? 'Complete Rotation of all Credentials'
          : '',
        errorMessage: 'Could not complete credential rotation',
        successMessage: `Completing credential rotation for ${this.shootName}`,
        heading: 'Do you want to complete the rotation of all credentials?',
        actions: [
          ...componentTexts['rotate-ca-complete'].actions,
          ...componentTexts['rotate-etcd-encryption-key-complete'].actions,
          ...componentTexts['rotate-serviceaccount-key-complete'].actions
        ]
      }
      return componentTexts[this.operation]
    }
  },
  methods: {
    ...mapActions([
      'setAlert'
    ]),
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

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      this.setAlert({
        message: this.componentTexts.successMessage
      })
    }
  },
  mounted () {
    this.maintenance = this.isScheduledForMaintenance
  }
}
</script>
