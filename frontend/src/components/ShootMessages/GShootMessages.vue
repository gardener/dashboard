<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-if="visible"
    v-model="popover"
    :toolbar-title="statusTitle"
    :toolbar-color="overallColor"
    content-text-class="pa-0"
  >
    <template #activator="{ props }">
      <g-action-button
        v-bind="props"
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
              :is="shootMessage.component.name"
              v-bind="shootMessage.component.props"
              class="g-message"
            />
          </g-list-item-content>
        </g-list-item>
      </g-list>
    </template>
  </g-popover>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import {
  useAuthzStore,
  useCloudProfileStore,
  useConfigStore,
} from '@/store'
import GK8sExpirationMessage from '@/components/ShootMessages/GK8sExpirationMessage.vue'
import GWorkerGroupExpirationMessage from '@/components/ShootMessages/GWorkerGroupExpirationMessage.vue'
import GNoHibernationScheduleMessage from '@/components/ShootMessages/GNoHibernationScheduleMessage.vue'
import GClusterExpirationMessage from '@/components/ShootMessages/GClusterExpirationMessage.vue'
import GConstraintMessage from '@/components/ShootMessages/GConstraintMessage.vue'
import GMaintenanceStatusMessage from '@/components/ShootMessages/GMaintenanceStatusMessage.vue'
import { shootItem } from '@/mixins/shootItem'
import { isSelfTerminationWarning } from '@/utils'
import {
  get,
  map,
  includes,
  isEmpty,
} from '@/utils/lodash'

export default {
  components: {
    GK8sExpirationMessage,
    GWorkerGroupExpirationMessage,
    GNoHibernationScheduleMessage,
    GClusterExpirationMessage,
    GConstraintMessage,
    GMaintenanceStatusMessage,
  },
  mixins: [shootItem],
  inject: ['mainContainer', 'logger'],
  props: {
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
  },
  data () {
    return {
      popover: false,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchShoots',
    ]),
    visible () {
      return !this.isShootMarkedForDeletion && this.shootMessages.length
    },
    shootMessages () {
      return [
        ...this.k8sMessage,
        ...this.machineImageMessages,
        ...this.noHibernationScheduleMessage,
        ...this.clusterExpirationMessage,
        ...this.hibernationConstraintMessage,
        ...this.maintenanceConstraintMessage,
        ...this.caCertificateValiditiesConstraintMessage,
        ...this.lastMaintenanceMessage,
      ]
    },
    k8sMessage () {
      if (!this.filterMatches('k8s')) {
        return []
      }
      const k8sAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      const k8sExpiration = this.kubernetesVersionExpirationForShoot(this.shootK8sVersion, this.shootCloudProfileName, k8sAutoPatch)
      if (!k8sExpiration) {
        return []
      }
      const { expirationDate, isValidTerminationDate, severity } = k8sExpiration
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
          },
        },
      }]
    },
    machineImageMessages () {
      if (!this.filterMatches('machine-image')) {
        return []
      }
      const imageAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
      const expiredWorkerGroups = this.expiringWorkerGroupsForShoot(this.shootWorkerGroups, this.shootCloudProfileName, imageAutoPatch)
      return map(expiredWorkerGroups, ({ expirationDate, isValidTerminationDate, version, name, workerName, severity }) => {
        return {
          key: `image_${workerName}_${name}`,
          icon: 'mdi-update',
          severity,
          component: {
            name: 'g-worker-group-expiration-message',
            props: {
              expirationDate,
              isValidTerminationDate,
              severity,
              name,
              workerName,
              version,
            },
          },
        }
      })
    },
    noHibernationScheduleMessage () {
      if (!this.filterMatches('no-hibernation-schedule')) {
        return []
      }
      if (!this.isShootHasNoHibernationScheduleWarning(this.shootItem)) {
        return []
      }
      return [{
        key: 'noHibernationSchedule',
        icon: 'mdi-calendar-alert',
        severity: 'info',
        component: {
          name: 'g-no-hibernation-schedule-message',
          props: {
            purposeText: this.shootPurpose || '',
            shootName: this.shootName || '',
            shootNamespace: this.shootNamespace || '',
            showNavigationLink: this.canPatchShoots && !isEmpty(this.shootName) && !isEmpty(this.shootNamespace),
          },
        },
      }]
    },
    clusterExpirationMessage () {
      if (!this.filterMatches('cluster-expiration')) {
        return []
      }
      if (!this.shootExpirationTimestamp) {
        return []
      }
      const isClusterExpirationWarningState = isSelfTerminationWarning(this.shootExpirationTimestamp)
      return [{
        key: 'clusterExpiration',
        icon: isClusterExpirationWarningState ? 'mdi-clock-alert-outline' : 'mdi-clock-outline',
        severity: isClusterExpirationWarningState ? 'warning' : 'info',
        component: {
          name: 'g-cluster-expiration-message',
          props: {
            shootExpirationTimestamp: this.shootExpirationTimestamp,
          },
        },
      }]
    },
    hibernationConstraintMessage () {
      if (!this.filterMatches('hibernation-constraint')) {
        return []
      }
      if (this.isHibernationPossible || !this.shootHibernationSchedules.length) {
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
            constraintMessage: this.hibernationPossibleMessage,
          },
        },
      }]
    },
    maintenanceConstraintMessage () {
      if (!this.filterMatches('maintenance-constraint')) {
        return []
      }
      if (this.isMaintenancePreconditionSatisfied) {
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
            constraintMessage: this.maintenancePreconditionSatisfiedMessage,
          },
        },
      }]
    },
    caCertificateValiditiesConstraintMessage () {
      if (!this.filterMatches('cacertificatevalidities-constraint')) {
        return []
      }
      if (this.isCACertificateValiditiesAcceptable) {
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
            constraintMessage: this.caCertificateValiditiesAcceptableMessage,
          },
        },
      }]
    },
    lastMaintenanceMessage () {
      if (!this.filterMatches('last-maintenance')) {
        return []
      }
      if (!this.lastMaintenance.state) {
        return []
      }
      if (!this.isLastMaintenanceFailed && !this.showVerbose) {
        return []
      }
      return [{
        key: 'lastMaintenanceFailedWarning',
        icon: this.isLastMaintenanceFailed ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline',
        severity: this.isLastMaintenanceFailed ? 'warning' : 'verbose',
        component: {
          name: 'g-maintenance-status-message',
          props: {
            triggeredTime: this.lastMaintenance.triggeredTime,
            description: this.lastMaintenance.description,
            state: this.lastMaintenance.state,
            failureReason: this.lastMaintenance.failureReason,
          },
        },
      }]
    },
    icon () {
      const icons = map(this.shootMessages, 'icon')
      if (icons.length === 1) {
        return icons[0]
      }

      if (this.overallSeverity === 'info' || this.overallSeverity === 'verbose') {
        return 'mdi-information-outline'
      }
      return 'mdi-alert-circle-outline'
    },
    overallSeverity () {
      for (const { severity } of this.shootMessages) {
        if (['error', 'warning', 'verbose'].includes(severity)) {
          return severity
        }
      }
      return 'info'
    },
    overallColor () {
      return this.colorForSeverity(this.overallSeverity)
    },
    tooltip () {
      if (this.title) {
        return this.title
      }
      if (this.overallSeverity === 'error') {
        return 'Cluster has issues with classification error'
      }
      if (this.overallSeverity === 'warning') {
        return 'Cluster has issues with classification warning'
      }
      return 'Cluster has notifications'
    },
    size () {
      return this.small ? 'small' : 'default'
    },
    statusTitle () {
      return this.title ? this.title : `Issues for Cluster ${this.shootName}`
    },
  },
  methods: {
    ...mapActions(useConfigStore, [
      'isShootHasNoHibernationScheduleWarning',
    ]),
    ...mapActions(useCloudProfileStore, [
      'kubernetesVersionExpirationForShoot',
      'expiringWorkerGroupsForShoot',
    ]),
    filterMatches (value) {
      if (isEmpty(this.filter)) {
        return true
      }
      if (Array.isArray(this.filter)) {
        return includes(this.filter, value)
      }
      return this.filter === value
    },
    colorForSeverity (severity) {
      switch (severity) {
        case 'error':
        case 'warning':
        case 'info':
          return severity
        case 'verbose':
        default:
          return 'primary'
      }
    },
  },
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
