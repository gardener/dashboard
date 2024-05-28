<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button-dialog
    ref="actionDialog"
    width="700"
    :caption="componentTexts.caption"
    :confirm-button-text="confirmButtonText"
    confirm-required
    :loading="showLoadingIndicator"
    :disabled="disabled"
    :icon="icon"
    :text="componentTexts.buttonText"
    :tooltip="tooltip"
    @dialog-opened="onConfigurationDialogOpened"
  >
    <template #content>
      <v-card-text>
        <div class="text-h5 pb-3">
          {{ componentTexts.heading }}
        </div>
        <v-alert
          v-if="mode === 'START'"
          type="info"
          variant="tonal"
          dense
        >
          Note: This rotation operation is split into two steps. This step will <strong>prepare</strong> the rotation.
        </v-alert>
        <v-alert
          v-if="mode === 'COMPLETE'"
          type="info"
          variant="tonal"
          dense
        >
          Note: This rotation operation is split into two steps. This step will <strong>complete</strong> the rotation.
        </v-alert>
        <div class="font-weight-bold py-3">
          Actions performed in this step
        </div>
        <ul class="px-4">
          <li
            v-for="action in componentTexts.actions"
            :key="action"
          >
            {{ action }}
          </li>
        </ul>
        <v-checkbox
          v-model="maintenance"
          label="Perform this operation in the maintenance time window"
          :disabled="isMaintenanceDisabled"
          :hint="maintenanceHint"
          persistent-hint
        />
        <div>Type <span class="font-weight-bold">{{ shootName }}</span> below to confirm the operation.</div>
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
import { useAuthnStore } from '@/store/authn'

import GActionButtonDialog from '@/components/dialogs/GActionButtonDialog.vue'

import { useShootItem } from '@/composables/useShootItem'
import { useShootStatusCredentialRotation } from '@/composables/useShootStatusCredentialRotation'

import { errorDetailsFromError } from '@/utils/error'

import {
  get,
  includes,
  compact,
} from '@/lodash'

export default {
  components: {
    GActionButtonDialog,
  },
  inject: ['api', 'logger'],
  props: {
    type: {
      type: String,
      required: true,
    },
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
      shootAnnotations,
      shootGardenerOperation,
      shootEnableStaticTokenKubeconfig,
      isShootStatusHibernated,
      hasShootWorkerGroups,
    } = useShootItem()

    const {
      phase,
      phaseType,
      rotationType,
    } = useShootStatusCredentialRotation(shootItem, {
      type: props.type,
    })

    const authnStore = useAuthnStore()

    const startOperation = computed(() => {
      return get(rotationType.value, 'startOperation')
    })

    const completionOperation = computed(() => {
      return get(rotationType.value, 'completionOperation')
    })

    const operation = computed(() => {
      if (phaseType.value === 'Prepared' || phaseType.value === 'Completing') {
        return completionOperation.value
      }
      return startOperation.value
    })

    const isActionToBeScheduled = computed(() => {
      return shootGardenerOperation.value === operation.value
    })

    const mode = computed(() => {
      if (!completionOperation.value) {
        return 'ROTATE'
      }
      if (operation.value === completionOperation.value) {
        return 'COMPLETE'
      }
      return 'START'
    })

    const isProgressing = computed(() => {
      if (mode.value === 'START' && phaseType.value === 'Preparing') {
        return true
      }
      if (mode.value === 'COMPLETE' && phaseType.value === 'Completing') {
        return true
      }
      if (!rotationType.value.twoStep && phaseType.value === 'Rotating') {
        return true
      }
      return false
    })

    const showLoadingIndicator = computed(() => {
      if (isActionToBeScheduled.value) {
        return true
      }
      if (isScheduled.value) {
        return true
      }
      if (isProgressing.value && props.type !== 'ALL_CREDENTIALS') {
        // Only show the loading indicator for the rotation that is actually running, not for the overall trigger button
        return true
      }
      return false
    })

    const disabled = computed(() => {
      if (phase.value && phase.value.incomplete) {
        return true
      }
      if (isHibernationPreventingRotation.value) {
        return true
      }
      if (isScheduledOperation.value) {
        return true
      }
      if (isProgressing.value) {
        return true
      }
      return false
    })

    const isScheduledForMaintenance = computed(() => {
      return shootAnnotations.value['maintenance.gardener.cloud/operation'] === operation.value
    })

    const isScheduled = computed(() => {
      return shootAnnotations.value['gardener.cloud/operation'] === operation.value
    })

    const isScheduledOperation = computed(() => {
      return !!shootAnnotations.value['gardener.cloud/operation']
    })

    const isMaintenanceDisabled = computed(() => {
      return !isScheduledForMaintenance.value && !!shootAnnotations.value['maintenance.gardener.cloud/operation']
    })

    const maintenanceHint = computed(() => {
      if (isMaintenanceDisabled.value) {
        return 'Another operation has already been scheduled. Only one operation at a time can be scheduled.'
      }
      return ''
    })

    const isHibernationPreventingRotation = computed(() => {
      return isShootStatusHibernated.value &&
        includes(['rotate-credentials-start',
          'rotate-etcd-encryption-key-start',
          'rotate-credentials-complete',
          'rotate-etcd-encryption-key-complete',
          'rotate-serviceaccount-key-start',
          'rotate-serviceaccount-key-complete'],
        operation.value)
    })

    const icon = computed(() => {
      if (isScheduledForMaintenance.value) {
        return 'mdi-clock-outline'
      }
      return 'mdi-refresh'
    })

    const confirmButtonText = computed(() => {
      if (isScheduledForMaintenance.value && !maintenance.value) {
        return 'Unschedule Rotation'
      }
      if (maintenance.value) {
        return 'Schedule Rotation'
      }
      switch (mode.value) {
        case 'START':
          return 'Prepare Rotation'
        case 'COMPLETE':
          return 'Complete Rotation'
      }
      return 'Rotate'
    })

    const tooltip = computed(() => {
      if (isScheduledForMaintenance.value) {
        return 'This operation is scheduled to be performed during the next maintenance time window'
      }
      if (isHibernationPreventingRotation.value && isShootStatusHibernated.value) {
        return 'Cluster is hibernated. Wake up cluster to perform this operation'
      }
      if (phase.value && phase.value.incomplete) {
        return 'Operation is disabled because all two-step operations need to be in the same phase'
      }
      if (!showLoadingIndicator.value && isScheduledOperation.value) {
        return 'There is already an operation scheduled for this cluster'
      }
      if (showLoadingIndicator.value && props.type === 'ALL_CREDENTIALS') {
        return 'A rotation operation is currently running'
      }
      return undefined
    })

    const componentTexts = computed(() => {
      const allComponentTexts = {
        'rotate-kubeconfig-credentials': {
          caption: showLoadingIndicator.value
            ? 'Rotating kubeconfig credentials'
            : 'Start Kubeconfig Rotation',
          errorMessage: 'Could not start the rotation of kubeconfig credentials',
          successMessage: `Rotation of kubeconfig credentials started for ${shootName.value}`,
          heading: 'Do you want to start the rotation of kubeconfig credentials?',
          actions: [
            'The current kubeconfig credentials will be revoked',
            'New kubeconfig credentials will be generated',
          ],
        },
        'rotate-ca-start': {
          caption: showLoadingIndicator.value
            ? 'Preparing certificate authorities rotation'
            : 'Prepare Certificate Authorities Rotation',
          errorMessage: 'Could not prepare the rotation of certificate authorities',
          successMessage: `Preparing rotation of certificate authorities for ${shootName.value}`,
          heading: 'Do you want to prepare the rotation of certificate authorities?',
          actions: [
            'New Certificate Authorities will be created and added to the bundle (old Certificate Authorities will remain in the bundle)',
          ],
        },
        'rotate-ca-complete': {
          caption: showLoadingIndicator.value
            ? 'Completing certificate authorities rotation'
            : 'Complete Certificate Authorities Rotation',
          errorMessage: 'Could not complete the rotation of certificate authorities',
          successMessage: `Completing rotation of certificate authorities for ${shootName.value}`,
          heading: 'Do you want to complete the rotation of certificate authorities?',
          actions: [
            'Old Certificate Authorities will be dropped from the bundle',
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their kubeconfig for this Shoot cluster since the rotation was prepared. Otherwise the client requests will fail as the old Certificate Authorities will be dropped from the bundle',
          ],
        },
        'rotate-observability-credentials': {
          caption: showLoadingIndicator.value
            ? 'Rotating observability passwords'
            : 'Start Observability Passwords Rotation',
          errorMessage: 'Could not start the rotation of observability passwords',
          successMessage: `Rotation of observability passwords started for ${shootName.value}`,
          heading: 'Do you want to start the rotation of observability passwords?',
          actions: compact([
            'The current observability passwords will be invalidated',
            'New observability passwords will be generated',
            authnStore.isAdmin
              ? 'Note Operator: This will invalidate the user observability passwords. Operator passwords will be rotated automatically. There is no way to trigger the rotation manually'
              : undefined,
          ]),
        },
        'rotate-ssh-keypair': {
          caption: showLoadingIndicator.value
            ? 'Rotating SSH key pair'
            : 'Start Worker Nodes SSH Key Pair Rotation',
          errorMessage: 'Could not start the rotation of SSH key pair',
          successMessage: `Rotation of SSH key pair started for ${shootName.value}`,
          heading: 'Do you want to start the rotation of SSH key pair for worker nodes?',
          actions: [
            'The current SSH key pair will be revoked.',
            'A new SSH key pair will be generated',
          ],
        },
        'rotate-etcd-encryption-key-start': {
          caption: showLoadingIndicator.value
            ? 'Preparing etcd encryption key rotation'
            : 'Prepare ETCD Encryption Key Rotation',
          errorMessage: 'Could not prepare the rotation of etcd encryption key',
          successMessage: `Preparing rotation of etcd encryption key for ${shootName.value}`,
          heading: 'Do you want to prepare the rotation of etcd encryption key?',
          actions: [
            'A new encryption key will be created and added to the bundle (old encryption key will remain in the bundle).',
            'All Secrets in the cluster will be rewritten by the kube-apiserver so that they become encrypted with the new encryption key.',
          ],
        },
        'rotate-etcd-encryption-key-complete': {
          caption: showLoadingIndicator.value
            ? 'Completing etcd encryption key rotation'
            : 'Complete ETCD Encryption Key Rotation',
          errorMessage: 'Could not complete the rotation of etcd encryption key',
          successMessage: `Completing rotation of etcd encryption key for ${shootName.value}`,
          heading: 'Do you want to complete the rotation of etcd encryption key?',
          actions: [
            'The old encryption will be dropped from the bundle.',
          ],
        },
        'rotate-serviceaccount-key-start': {
          caption: showLoadingIndicator.value
            ? 'Preparing ServiceAccount token signing key rotation'
            : 'Prepare ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not prepare the rotation of ServiceAccount token signing key',
          successMessage: `Preparing rotation of ServiceAccount token signing key for ${shootName.value}`,
          heading: 'Do you want to prepare the rotation of ServiceAccount token signing key?',
          actions: [
            'A new signing key will be created and added to the bundle (old signing key will remain in the bundle)',
          ],
        },
        'rotate-serviceaccount-key-complete': {
          caption: showLoadingIndicator.value
            ? 'Completing ServiceAccount token signing key rotation'
            : 'Complete ServiceAccount Token Signing Key Rotation',
          errorMessage: 'Could not complete the rotation of ServiceAccount token signing key',
          successMessage: `Completing rotation of ServiceAccount token signing key for ${shootName.value}`,
          heading: 'Do you want to complete the rotation of ServiceAccount token signing key?',
          actions: [
            'Old signing key will be dropped from the bundle',
            'Ensure that all parties (end-users, CD pipelines etc.) have updated their ServiceAccount kubeconfigs for this Shoot cluster since the rotation was prepared. Otherwise the client requests will fail as the old signing key will be dropped from the bundle',
          ],
        },
      }
      allComponentTexts['rotate-credentials-start'] = {
        caption: showLoadingIndicator.value
          ? 'Preparing credential rotation'
          : 'Start Rotation of all Credentials',
        buttonText: props.text ? 'Prepare Rotation of all Credentials' : '',
        errorMessage: 'Could not prepare credential rotation',
        successMessage: `Preparing credential rotation for ${shootName.value}`,
        heading: 'Do you want to prepare the rotation of all credentials?',
        actions: [
          ...shootEnableStaticTokenKubeconfig.value
            ? allComponentTexts['rotate-kubeconfig-credentials'].actions
            : [],
          ...allComponentTexts['rotate-ca-start'].actions,
          ...allComponentTexts['rotate-observability-credentials'].actions,
          ...hasShootWorkerGroups.value
            ? allComponentTexts['rotate-ssh-keypair'].actions
            : [],
          ...allComponentTexts['rotate-etcd-encryption-key-start'].actions,
          ...allComponentTexts['rotate-serviceaccount-key-start'].actions,
        ],
      }
      allComponentTexts['rotate-credentials-complete'] = {
        caption: showLoadingIndicator.value
          ? 'Completing credential rotation'
          : 'Complete Rotation of all Credentials',
        buttonText: props.text
          ? 'Complete Rotation of all Credentials'
          : '',
        errorMessage: 'Could not complete credential rotation',
        successMessage: `Completing credential rotation for ${shootName.value}`,
        heading: 'Do you want to complete the rotation of all credentials?',
        actions: [
          ...allComponentTexts['rotate-ca-complete'].actions,
          ...allComponentTexts['rotate-etcd-encryption-key-complete'].actions,
          ...allComponentTexts['rotate-serviceaccount-key-complete'].actions,
        ],
      }
      return allComponentTexts[operation.value]
    })

    const actionTriggered = ref(false)
    const maintenance = ref(isScheduledForMaintenance.value)

    const appStore = useAppStore()

    watch(isActionToBeScheduled, value => {
      const isActionScheduled = !value && actionTriggered.value
      if (!isActionScheduled) {
        return
      }
      actionTriggered.value = false

      if (!shootName.value) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      appStore.setSuccess(componentTexts.value.successMessage)
    })

    return {
      shootName,
      shootNamespace,
      phase,
      phaseType,
      rotationType,
      mode,
      operation,
      startOperation,
      completionOperation,
      isActionToBeScheduled,
      isProgressing,
      showLoadingIndicator,
      disabled,
      isScheduledForMaintenance,
      isScheduled,
      isScheduledOperation,
      isMaintenanceDisabled,
      maintenanceHint,
      isHibernationPreventingRotation,
      icon,
      confirmButtonText,
      tooltip,
      componentTexts,
      actionTriggered,
      maintenance,
    }
  },
  methods: {
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.start()
      }
    },
    async start () {
      this.actionTriggered = true
      const annotations = {}
      if (this.maintenance) {
        annotations['maintenance.gardener.cloud/operation'] = this.operation
      } else if (this.isScheduledForMaintenance) {
        // remove annotation if this operation was scheduled for maintenance
        annotations['maintenance.gardener.cloud/operation'] = null
      } else {
        annotations['gardener.cloud/operation'] = this.operation
      }
      try {
        await this.api.addShootAnnotation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: annotations,
        })
      } catch (err) {
        const errorMessage = this.componentTexts.errorMessage
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.actionTriggered = false
      }
    },
  },
}
</script>
