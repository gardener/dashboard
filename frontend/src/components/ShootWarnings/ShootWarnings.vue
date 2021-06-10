<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    v-if="visible"
    :title="`Issues for Cluster ${shootName}`"
    :toolbar-color="overallStatus"
    :popper-key="`shoot_warning_${shootName}_${shootNamespace}`"
  >
    <template v-slot:popperRef>
      <v-btn icon :x-small="small">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" :color="overallStatus" :small="small">{{icon}}</v-icon>
          </template>
          <span>{{tooltip}}</span>
        </v-tooltip>
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="({key, icon, color, messageComponent, messageComponentProperties}) in warningItems"
        :key="key">
        <v-list-item-icon>
          <v-icon :color="color">{{icon}}</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <component :is="messageComponent" v-bind="messageComponentProperties" class="message" />
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
import K8sExpirationMessage from '@/components/ShootWarnings/K8sExpirationMessage'
import WorkerGroupExpirationMessage from '@/components/ShootWarnings/WorkerGroupExpirationMessage'
import NoHibernationScheduleMessage from '@/components/ShootWarnings/NoHibernationScheduleMessage'
import ClusterExpirationMessage from '@/components/ShootWarnings/ClusterExpirationMessage'
import ConstraintWarningMessage from '@/components/ShootWarnings/ConstraintWarningMessage'
import some from 'lodash/some'
import get from 'lodash/get'
import map from 'lodash/map'
import forEach from 'lodash/forEach'
import { shootItem } from '@/mixins/shootItem'
import {
  k8sVersionExpirationForShoot,
  expiringWorkerGroupsForShoot,
  isShootHasNoHibernationScheduleWarning,
  isSelfTerminationWarning
} from '@/utils'
import { mapGetters } from 'vuex'

export default {
  name: 'ShootWarnings',
  components: {
    GPopper,
    K8sExpirationMessage,
    WorkerGroupExpirationMessage,
    NoHibernationScheduleMessage,
    ClusterExpirationMessage,
    ConstraintWarningMessage
  },
  props: {
    shootItem: {
      type: Object
    },
    small: {
      type: Boolean,
      default: false
    },
    allWarnings: {
      type: Boolean,
      default: false
    },
    k8sWarning: {
      type: Boolean,
      default: false
    },
    machineImageWarning: {
      type: Boolean,
      default: false
    },
    noHibernationScheduleWarning: {
      type: Boolean,
      default: false
    },
    clusterExpirationWarning: {
      type: Boolean,
      default: false
    },
    hibernationConstraintWarning: {
      type: Boolean,
      default: false
    },
    maintenanceConstraintWarning: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots'
    ]),
    visible () {
      return !this.isShootMarkedForDeletion && (
        this.isK8sWarning ||
        this.isMachineImageWarning ||
        this.isNoHibernationScheduleWarning ||
        this.isClusterExpirationWarning ||
        this.isConstraintWarning
      )
    },
    warningItems () {
      const items = []
      if (this.isK8sWarning) {
        const { expirationDate, isValidTerminationDate, severity } = this.k8sExpiration
        items.push({
          key: 'k8sWarning',
          icon: 'mdi-update',
          color: this.colorForSeverity(severity),
          messageComponent: 'K8sExpirationMessage',
          messageComponentProperties: {
            expirationDate,
            isValidTerminationDate,
            severity
          }
        })
      }
      if (this.isMachineImageWarning) {
        forEach(this.expiredWorkerGroups, ({ expirationDate, isValidTerminationDate, version, name, workerName, severity }) => {
          items.push({
            key: `image_${workerName}_${name}`,
            icon: 'mdi-update',
            color: this.colorForSeverity(severity),
            messageComponent: 'WorkerGroupExpirationMessage',
            messageComponentProperties: {
              expirationDate,
              isValidTerminationDate,
              severity,
              name,
              workerName,
              version
            }
          })
        })
      }
      if (this.isNoHibernationScheduleWarning) {
        items.push({
          key: 'noHibernationSchedule',
          icon: 'mdi-calendar-alert',
          color: 'info',
          messageComponent: 'NoHibernationScheduleMessage',
          messageComponentProperties: {
            purposeText: this.shootPurpose || '',
            shootName: this.shootName || '',
            shootNamespace: this.shootNamespace || '',
            showNavigationLink: this.canPatchShoots
          }
        })
      }
      if (this.isClusterExpirationWarning) {
        items.push({
          key: 'clusterExpiration',
          icon: this.isClusterExpirationWarningState ? 'mdi-clock-alert-outline' : 'mdi-clock-outline',
          color: this.isClusterExpirationWarningState ? 'warning' : 'info',
          messageComponent: 'ClusterExpirationMessage',
          messageComponentProperties: {
            shootExpirationTimestamp: this.shootExpirationTimestamp
          }
        })
      }
      if (this.isConstraintWarning) {
        forEach(this.constraintWarnings, ({ constraintCaption, constraintMessage }) => {
          items.push({
            key: `constraint_${constraintCaption}`,
            icon: 'mdi-alert-circle-outline',
            color: 'warning',
            messageComponent: 'ConstraintWarningMessage',
            messageComponentProperties: {
              constraintCaption,
              constraintMessage
            }
          })
        })
      }

      return items
    },
    isK8sWarning () {
      if (!this.k8sWarning && !this.allWarnings) {
        return false
      }
      return !!this.k8sExpiration
    },
    k8sExpiration () {
      const k8sAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.kubernetesVersion', false)
      return k8sVersionExpirationForShoot(this.shootK8sVersion, this.shootCloudProfileName, k8sAutoPatch)
    },
    isMachineImageWarning () {
      if (!this.machineImageWarning && !this.allWarnings) {
        return false
      }
      return this.expiredWorkerGroups.length > 0
    },
    expiredWorkerGroups () {
      const imageAutoPatch = get(this.shootItem, 'spec.maintenance.autoUpdate.machineImageVersion', false)
      return expiringWorkerGroupsForShoot(this.shootWorkerGroups, this.shootCloudProfileName, imageAutoPatch)
    },
    isNoHibernationScheduleWarning () {
      if (!this.noHibernationScheduleWarning && !this.allWarnings) {
        return false
      }
      return isShootHasNoHibernationScheduleWarning(this.shootItem)
    },
    isClusterExpirationWarning () {
      if (!this.clusterExpirationWarning && !this.allWarnings) {
        return false
      }
      return !!this.shootExpirationTimestamp
    },
    isClusterExpirationWarningState () {
      return isSelfTerminationWarning(this.shootExpirationTimestamp)
    },
    constraintWarnings () {
      const warnings = []
      if (this.hibernationConstraintWarning || this.allWarnings) {
        if (!this.isHibernationPossible && this.shootHibernationSchedules.length > 0) {
          warnings.push({
            constraintCaption: 'Your hibernation schedule may not have any effect',
            constraintMessage: this.hibernationPossibleMessage
          })
        }
      }
      if (this.maintenanceConstraintWarning || this.allWarnings) {
        if (!this.isMaintenancePreconditionSatisfied) {
          warnings.push({
            constraintCaption: 'Maintenance precondition check failed. It may not be safe to start maintenance for your cluster due to the following reason',
            constraintMessage: this.maintenancePreconditionSatisfiedMessage
          })
        }
      }
      return warnings
    },
    isConstraintWarning () {
      return this.constraintWarnings.length
    },
    icon () {
      const icons = map(this.warningItems, 'icon')
      if (icons.length === 1) {
        return icons[0]
      }

      if (this.overallStatus === 'info') {
        return 'mdi-information-outline'
      }
      return 'mdi-alert-circle-outline'
    },
    overallStatus () {
      if (some(this.warningItems, { color: 'error' })) {
        return 'error'
      }
      if (some(this.warningItems, { color: 'warning' })) {
        return 'warning'
      }
      return 'info'
    },
    tooltip () {
      if (this.overallStatus === 'error') {
        return 'Cluster has issues with classification error'
      }
      if (this.overallStatus === 'warning') {
        return 'Cluster has issues with classification warning'
      }
      return 'Cluster has notifications'
    }
  },
  methods: {
    colorForSeverity (severity) {
      switch (severity) {
        case 'error':
        case 'warning':
        case 'info':
          return severity
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

  ::v-deep .v-card__text {
    padding: 0px;
  }

  ::v-deep .v-list-item__icon {
    padding: 8px 16px 8px 0px;
    margin: 0px !important;
  }

  ::v-deep .v-list-item__content {
    padding: 0px;
  }

  ::v-deep .v-list-item {
    min-height: 0px;
  }

</style>
