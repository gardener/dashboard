<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    v-if="visible"
    :title="statusTitle"
    :toolbar-color="overallColor"
    :popper-key="`shoot_warning_${shootName}_${shootNamespace}`"
  >
    <template v-slot:popperRef>
      <v-btn icon :size="small && 'x-small'">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" :color="overallColor" :size="small && 'small'">{{icon}}</v-icon>
          </template>
          <span>{{tooltip}}</span>
        </v-tooltip>
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="({key, icon, severity, component }) in shootMessages"
        :key="key">
        <v-list-item-icon>
          <v-icon :color="colorForSeverity(severity)">{{icon}}</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <component :is="component.name" v-bind="component.props" class="message" />
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper.vue'
import K8sExpirationMessage from '@/components/ShootMessages/K8sExpirationMessage.vue'
import WorkerGroupExpirationMessage from '@/components/ShootMessages/WorkerGroupExpirationMessage.vue'
import NoHibernationScheduleMessage from '@/components/ShootMessages/NoHibernationScheduleMessage.vue'
import ClusterExpirationMessage from '@/components/ShootMessages/ClusterExpirationMessage.vue'
import ConstraintMessage from '@/components/ShootMessages/ConstraintMessage.vue'
import MaintenanceStatusMessage from '@/components/ShootMessages/MaintenanceStatusMessage.vue'
import get from 'lodash/get'
import map from 'lodash/map'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import { shootItem } from '@/mixins/shootItem'
import {
  isSelfTerminationWarning
} from '@/utils'
import { mapGetters } from 'vuex'

export default {
  name: 'shoot-messages',
  components: {
    GPopper,
    K8sExpirationMessage,
    WorkerGroupExpirationMessage,
    NoHibernationScheduleMessage,
    ClusterExpirationMessage,
    ConstraintMessage,
    MaintenanceStatusMessage
  },
  props: {
    small: {
      type: Boolean,
      default: false
    },
    filter: {
      type: [String, Array],
      required: false
    },
    title: {
      type: String,
      required: false
    },
    showVerbose: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots',
      'isShootHasNoHibernationScheduleWarning',
      'kubernetesVersionExpirationForShoot',
      'expiringWorkerGroupsForShoot'
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
        ...this.lastMaintenanceMessage
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
          name: 'k8s-expiration-message',
          props: {
            expirationDate,
            isValidTerminationDate,
            severity
          }
        }
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
            name: 'worker-group-expiration-message',
            props: {
              expirationDate,
              isValidTerminationDate,
              severity,
              name,
              workerName,
              version
            }
          }
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
          name: 'no-hibernation-schedule-message',
          props: {
            purposeText: this.shootPurpose || '',
            shootName: this.shootName || '',
            shootNamespace: this.shootNamespace || '',
            showNavigationLink: this.canPatchShoots && !isEmpty(this.shootName) && !isEmpty(this.shootNamespace)
          }
        }
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
          name: 'cluster-expiration-message',
          props: {
            shootExpirationTimestamp: this.shootExpirationTimestamp
          }
        }
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
          name: 'constraint-message',
          props: {
            constraintCaption: 'Your hibernation schedule may not have any effect',
            constraintMessage: this.hibernationPossibleMessage
          }
        }
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
          name: 'constraint-message',
          props: {
            constraintCaption: 'Maintenance precondition check failed. Gardener may be unable to perform required actions during maintenance',
            constraintMessage: this.maintenancePreconditionSatisfiedMessage
          }
        }
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
          name: 'constraint-message',
          props: {
            constraintCaption: 'Certificate Authorities will expire in less than one year',
            constraintMessage: this.caCertificateValiditiesAcceptableMessage
          }
        }
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
          name: 'maintenance-status-message',
          props: {
            triggeredTime: this.lastMaintenance.triggeredTime,
            description: this.lastMaintenance.description,
            state: this.lastMaintenance.state,
            failureReason: this.lastMaintenance.failureReason
          }
        }
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
    statusTitle () {
      return this.title ? this.title : `Issues for Cluster ${this.shootName}`
    }
  },
  methods: {
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
    }
  }
}
</script>

<style lang="scss" scoped>

  .message {
    text-align: left;
    min-width: 250px;
    max-width: 700px;
    white-space: normal;
    overflow-y: auto;
  }

  :deep(.v-card) {
    .v-card__text {
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
