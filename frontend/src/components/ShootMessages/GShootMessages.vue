<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="internalValue"
    :disabled="!visible"
    :toolbar-title="statusTitle"
    :toolbar-color="overallColor"
    content-text-class="pa-0"
  >
    <template #activator="slotProps">
      <g-action-button
        v-if="visible"
        v-bind="slotProps.props"
        :icon="icon"
        :color="overallColor"
        :size="size"
        :tooltip="tooltip"
        :tooltip-disabled="popover"
      />
    </template>
    <template #text>
      <g-list
        density="compact"
        class="py-1"
      >
        <g-list-item
          v-for="shootMessage in shootMessages"
          :key="shootMessage.key"
        >
          <template #prepend>
            <v-icon
              :icon="shootMessage.icon"
              :color="colorForSeverity(shootMessage.severity)"
            />
          </template>
          <g-list-item-content>
            <component
              :is="resolveComponent(shootMessage.component.name)"
              v-bind="shootMessage.component.props"
              class="g-message"
            />
          </g-list-item-content>
        </g-list-item>
      </g-list>
    </template>
  </g-popover>
</template>

<script setup>
import {
  ref,
  computed,
  toRefs,
  inject,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'

import { useShootItem } from '@/composables/useShootItem'
import { useKubernetesVersions } from '@/composables/useCloudProfile/useKubernetesVersions.js'
import { useShootMessages } from '@/composables/useShootMessages'

import { isSelfTerminationWarning } from '@/utils'

import GK8sExpirationMessage from './GK8sExpirationMessage.vue'
import GWorkerGroupExpirationMessage from './GWorkerGroupExpirationMessage.vue'
import GNoHibernationScheduleMessage from './GNoHibernationScheduleMessage.vue'
import GClusterExpirationMessage from './GClusterExpirationMessage.vue'
import GConstraintMessage from './GConstraintMessage.vue'
import GMaintenanceStatusMessage from './GMaintenanceStatusMessage.vue'
import GForceDeleteMessage from './GForceDeleteMessage.vue'

import orderBy from 'lodash/orderBy'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import map from 'lodash/map'
import get from 'lodash/get'

const components = {
  'g-k8s-expiration-message': GK8sExpirationMessage,
  'g-worker-group-expiration-message': GWorkerGroupExpirationMessage,
  'g-no-hibernation-schedule-message': GNoHibernationScheduleMessage,
  'g-cluster-expiration-message': GClusterExpirationMessage,
  'g-constraint-message': GConstraintMessage,
  'g-maintenance-status-message': GMaintenanceStatusMessage,
  'g-force-delete-message': GForceDeleteMessage,
}

function resolveComponent (name) {
  return components[name] // eslint-disable-line security/detect-object-injection
}

const props = defineProps({
  small: {
    type: Boolean,
    default: false,
  },
  filter: {
    type: [String, Array],
    required: false,
  },
  title: {
    type: String,
    required: false,
  },
  showVerbose: {
    type: Boolean,
    default: false,
  },
})
const {
  small,
  filter,
  title,
  showVerbose,
} = toRefs(props)

const activePopoverKey = inject('activePopoverKey')
const {
  shootItem,
  shootNamespace,
  shootName,
  shootMetadata,
  shootPurpose,
  shootK8sVersion,
  shootCloudProfileRef,
  shootWorkerGroups,
  canForceDeleteShoot,
  isShootMarkedForDeletion,
  shootExpirationTimestamp,
  isHibernationPossible,
  shootHibernationSchedules,
  hibernationPossibleMessage,
  isMaintenancePreconditionSatisfied,
  maintenancePreconditionSatisfiedMessage,
  isCACertificateValiditiesAcceptable,
  caCertificateValiditiesAcceptableMessage,
  isLastMaintenanceFailed,
  lastMaintenance,
} = useShootItem()

const configStore = useConfigStore()
const cloudProfileStore = useCloudProfileStore()
const authzStore = useAuthzStore()
const {
  canPatchShoots,
} = storeToRefs(authzStore)

const popover = ref(false)

const internalValue = computed({
  get () {
    return activePopoverKey.value === popoverKey.value
  },
  set (value) {
    activePopoverKey.value = value ? popoverKey.value : ''
  },
})

const popoverKey = computed(() => {
  const key = Array.isArray(filter.value)
    ? filter.value.join(',')
    : filter.value ?? '*'
  return `g-shoot-messages[${key}]:${shootMetadata.value.uid}`
})

const visible = computed(() => {
  return !isShootMarkedForDeletion.value && shootMessages.value.length
})

const shootMessages = computed(() => {
  return [
    ...k8sMessage.value,
    ...machineImageMessages.value,
    ...noHibernationScheduleMessage.value,
    ...clusterExpirationMessage.value,
    ...hibernationConstraintMessage.value,
    ...maintenanceConstraintMessage.value,
    ...caCertificateValiditiesConstraintMessage.value,
    ...lastMaintenanceMessage.value,
    ...forceDeleteMessage.value,
  ]
})

const k8sAutoPatch = computed(() => get(shootItem.value, ['spec', 'maintenance', 'autoUpdate', 'kubernetesVersion'], false))
const cloudProfile = computed(() => cloudProfileStore.cloudProfileByRef(shootCloudProfileRef.value))
const { useKubernetesVersionExpirationForShoot } = useKubernetesVersions(cloudProfile)
const k8sExpiration = useKubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
const { useExpiringWorkerGroupsForShoot } = useShootMessages(cloudProfile)

const k8sMessage = computed(() => {
  if (!filterMatches('k8s')) {
    return []
  }
  if (!k8sExpiration.value) {
    return []
  }
  const {
    expirationDate,
    isValidTerminationDate,
    severity,
    isExpired,
  } = k8sExpiration.value
  return [{
    key: 'k8sWarning',
    icon: 'mdi-update',
    severity,
    component: {
      name: 'g-k8s-expiration-message',
      props: {
        expirationDate,
        isValidTerminationDate,
        severity,
        isExpired,
      },
    },
  }]
})

const machineImageMessages = computed(() => {
  if (!filterMatches('machine-image')) {
    return []
  }
  const imageAutoPatch = get(shootItem.value, ['spec', 'maintenance', 'autoUpdate', 'machineImageVersion'], false)

  const shootWorkerGroupsRef = computed(() => shootWorkerGroups.value)
  const imageAutoPatchRef = computed(() => imageAutoPatch)
  const expiredWorkerGroups = useExpiringWorkerGroupsForShoot(shootWorkerGroupsRef, imageAutoPatchRef)
  return map(expiredWorkerGroups.value, workerGroup => {
    const {
      expirationDate,
      isValidTerminationDate,
      isExpired,
      version,
      name,
      workerName,
      severity,
      supportedVersionAvailable,
    } = workerGroup
    return {
      key: `image_${workerName}_${name}`,
      icon: 'mdi-update',
      severity,
      component: {
        name: 'g-worker-group-expiration-message',
        props: {
          expirationDate,
          isValidTerminationDate,
          isExpired,
          severity,
          name,
          workerName,
          version,
          supportedVersionAvailable,
        },
      },
    }
  })
})

const noHibernationScheduleMessage = computed(() => {
  if (!filterMatches('no-hibernation-schedule')) {
    return []
  }
  if (!configStore.isShootHasNoHibernationScheduleWarning(shootItem.value)) {
    return []
  }
  return [{
    key: 'noHibernationSchedule',
    icon: 'mdi-calendar-alert',
    severity: 'info',
    component: {
      name: 'g-no-hibernation-schedule-message',
      props: {
        purposeText: shootPurpose.value || '',
        shootName: shootName.value || '',
        shootNamespace: shootNamespace.value || '',
        showNavigationLink: canPatchShoots.value && !isEmpty(shootName.value) && !isEmpty(shootNamespace.value),
      },
    },
  }]
})

const clusterExpirationMessage = computed(() => {
  if (!filterMatches('cluster-expiration')) {
    return []
  }
  if (!shootExpirationTimestamp.value) {
    return []
  }
  const isClusterExpirationWarningState = isSelfTerminationWarning(shootExpirationTimestamp.value)
  return [{
    key: 'clusterExpiration',
    icon: isClusterExpirationWarningState ? 'mdi-clock-alert-outline' : 'mdi-clock-outline',
    severity: isClusterExpirationWarningState ? 'warning' : 'info',
    component: {
      name: 'g-cluster-expiration-message',
      props: {
        shootExpirationTimestamp: shootExpirationTimestamp.value,
      },
    },
  }]
})

const hibernationConstraintMessage = computed(() => {
  if (!filterMatches('hibernation-constraint')) {
    return []
  }
  if (isHibernationPossible.value || !shootHibernationSchedules.value.length) {
    return []
  }
  return [{
    key: 'hibernationConstraintWarning',
    icon: 'mdi-alert-circle-outline',
    severity: 'warning',
    component: {
      name: 'g-constraint-message',
      props: {
        constraintCaption: 'Your hibernation schedule may not have any effect',
        constraintMessage: hibernationPossibleMessage.value,
      },
    },
  }]
})

const maintenanceConstraintMessage = computed(() => {
  if (!filterMatches('maintenance-constraint')) {
    return []
  }
  if (isMaintenancePreconditionSatisfied.value) {
    return []
  }
  return [{
    key: 'maintenanceConstraintWarning',
    icon: 'mdi-alert-circle-outline',
    severity: 'error',
    component: {
      name: 'g-constraint-message',
      props: {
        constraintCaption: 'Maintenance precondition check failed. Gardener may be unable to perform required actions during maintenance',
        constraintMessage: maintenancePreconditionSatisfiedMessage.value,
      },
    },
  }]
})

const caCertificateValiditiesConstraintMessage = computed(() => {
  if (!filterMatches('cacertificatevalidities-constraint')) {
    return []
  }
  if (isCACertificateValiditiesAcceptable.value) {
    return []
  }
  return [{
    key: 'caCertificateValiditiesConstraintWarning',
    icon: 'mdi-clock-alert-outline',
    severity: 'warning',
    component: {
      name: 'g-constraint-message',
      props: {
        constraintCaption: 'Certificate Authorities will expire in less than one year',
        constraintMessage: caCertificateValiditiesAcceptableMessage.value,
      },
    },
  }]
})

const lastMaintenanceMessage = computed(() => {
  if (!filterMatches('last-maintenance')) {
    return []
  }
  if (!lastMaintenance.value.state) {
    return []
  }
  if (!isLastMaintenanceFailed.value && !showVerbose.value) {
    return []
  }
  return [{
    key: 'lastMaintenanceFailedWarning',
    icon: isLastMaintenanceFailed.value ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline',
    severity: isLastMaintenanceFailed.value ? 'warning' : 'verbose',
    component: {
      name: 'g-maintenance-status-message',
      props: {
        triggeredTime: lastMaintenance.value.triggeredTime,
        description: lastMaintenance.value.description,
        state: lastMaintenance.value.state,
        failureReason: lastMaintenance.value.failureReason,
      },
    },
  }]
})

const forceDeleteMessage = computed(() => {
  if (!filterMatches('force-delete')) {
    return []
  }
  if (!hasFilter.value) {
    // Force delete message shall not be visible if no filter is specified
    return []
  }
  if (!canForceDeleteShoot.value) {
    return []
  }
  return [{
    key: 'canForceDelete',
    icon: 'mdi-alert-circle-outline',
    severity: 'error',
    component: {
      name: 'g-force-delete-message',
    },
  }]
})

const icon = computed(() => {
  const icons = map(shootMessages.value, 'icon')
  if (icons.length === 1) {
    return icons[0]
  }

  if (overallSeverity.value === 'info' || overallSeverity.value === 'verbose') {
    return 'mdi-information-outline'
  }
  return 'mdi-alert-circle-outline'
})

const overallSeverity = computed(() => {
  const severityOrder = { error: 1, warning: 2, info: 3, verbose: 4 }
  const sortedMessages = orderBy(shootMessages.value, [message => severityOrder[message.severity]], ['asc'])
  return sortedMessages[0]?.severity ?? 'info'
})

const overallColor = computed(() => {
  return colorForSeverity(overallSeverity.value)
})

const tooltip = computed(() => {
  if (title.value) {
    return title.value
  }
  if (overallSeverity.value === 'error') {
    return 'Cluster has issues with classification error'
  }
  if (overallSeverity.value === 'warning') {
    return 'Cluster has issues with classification warning'
  }
  return 'Cluster has notifications'
})

const size = computed(() => {
  return small.value ? 'small' : 'default'
})

const statusTitle = computed(() => {
  return title.value ? title.value : `Issues for Cluster ${shootName.value}`
})

const hasFilter = computed(() => {
  return !isEmpty(filter.value)
})

function filterMatches (value) {
  if (!hasFilter.value) {
    return true
  }
  if (Array.isArray(filter.value)) {
    return includes(filter.value, value)
  }
  return filter.value === value
}

function colorForSeverity (severity) {
  switch (severity) {
    case 'error':
    case 'warning':
    case 'info':
      return severity
    case 'verbose':
    default:
      return 'primary'
  }
}
</script>

<style lang="scss" scoped>
  .g-message {
    text-align: left;
    min-width: 250px;
    max-width: 700px;
    white-space: normal;
    overflow-y: auto;
  }
  :deep(.v-card .v-card-text) {
    padding: 0px !important;
  }

  :deep(.v-card) {

    .v-card-text {
      padding: 0px;
    }
    .v-list-item__icon {
      padding: 8px 16px 8px 0px;
      margin: 0px !important;
    }

    .v-list-item__content {
      padding: 5px;
    }

    .v-list-item {
      min-height: 0px;
    }
  }
</style>
