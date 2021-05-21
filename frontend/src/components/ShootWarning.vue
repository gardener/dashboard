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
      <v-list-item v-if="isK8sWarning">
        <v-list-item-icon>
          <v-icon :color="k8sExpiration.color">mdi-update</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <div class="message">
            <span v-if="k8sExpiration.isValidTerminationDate">Kubernetes version of this cluster expires
              <v-tooltip right>
                <template v-slot:activator="{ on }">
                  <span class="font-weight-bold" v-on="on"><time-string :date-time="k8sExpiration.expirationDate" mode="future"></time-string></span>
                </template>
                <span>{{getDateFormatted(k8sExpiration.expirationDate)}}</span>
              </v-tooltip>
              <span>. </span>
            </span>
            <span v-else>Kubernetes version of this cluster is expired. </span>
            <span v-if="k8sExpiration.isInfo">Version will be updated in the next maintenance window</span>
            <template v-if="k8sExpiration.isWarning">
              <span v-if="k8sExpiration.isValidTerminationDate">Version update will be enforced after that date</span>
              <span v-else>Version update will be enforced soon</span>
            </template>
            <span v-if="k8sExpiration.isError">Version update not possible due to missing update path. Please contact your landscape administrator</span>
          </div>
        </v-list-item-content>
      </v-list-item>

      <v-list-item v-for="({expirationDate, isValidTerminationDate, version, name, workerName, key, isInfo, isWarning, isError, color}) in expiredWorkerGroups" :key="key">
        <v-list-item-icon>
          <v-icon :color="color">mdi-update</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <div class="message">
            <span>Machine image <span class="font-weight-bold">{{name}} | Version: {{version}}</span> of worker group <span class="font-weight-bold">{{workerName}} </span></span>
            <span v-if="isValidTerminationDate">expires
              <v-tooltip right>
                <template v-slot:activator="{ on }">
                  <span class="font-weight-bold" v-on="on"><time-string :date-time="expirationDate" mode="future"></time-string></span>
                </template>
                <span>{{getDateFormatted(expirationDate)}}</span>
              </v-tooltip>
              <span>. </span>
            </span>
            <span v-else>is expired. </span>
            <span v-if="isInfo">Version will be updated in the next maintenance window</span>
            <template v-if="isWarning">
              <span v-if="isValidTerminationDate">Machine Image update will be enforced after that date</span>
                <span v-else>Machine Image update will be enforced soon</span>
            </template>
            <span v-if="isError">Machine Image update not possible as no newer version is available. Please choose another operating system</span>
          </div>
        </v-list-item-content>
      </v-list-item>

      <v-list-item v-if="isNoHibernationScheduleWarning">
        <v-list-item-icon>
          <v-icon color="info">mdi-calendar-alert</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <div class="message">
            To reduce expenses, this <span class="font-weight-bold">{{purposeText}}</span> cluster should have a hibernation schedule.
            <template v-if="canPatchShoots">
              Please navigate to the cluster details page to
              <router-link :to="{ name: 'ShootItemHibernationSettings', params: { name: shootName, namespace: shootNamespace } }">configure</router-link>
              a hibernation schedule or explicitly deactivate scheduled hibernation for this cluster.
            </template>
          </div>
        </v-list-item-content>
      </v-list-item>

      <v-list-item v-if="isClusterExpirationWarning">
        <v-list-item-icon>
          <v-icon color="warning" v-if="isClusterExpirationWarningState">mdi-clock-alert-outline</v-icon>
          <v-icon color="info" v-else>mdi-clock-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <div class="message">
            <span v-if="isValidTerminationDate">This cluster will self terminate <span class="font-weight-bold"><time-string :date-time="shootExpirationTimestamp" mode="future"></time-string></span></span>
            <span v-else>This cluster is about to self terminate</span>
          </div>
        </v-list-item-content>
      </v-list-item>

      <v-list-item v-for="({constraintCaption, constraintMessage}) in constraintWarnings" :key="constraintCaption">
        <v-list-item-icon>
          <v-icon color="warning">mdi-alert-circle-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <div class="message">
            <span class="font-weight-bold">{{constraintCaption}}: </span>
            <span>{{constraintMessage}}</span>
          </div>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </g-popper>
</template>

<script>

import TimeString from '@/components/TimeString'
import GPopper from '@/components/GPopper'
import some from 'lodash/some'
import get from 'lodash/get'
import { shootItem } from '@/mixins/shootItem'
import {
  k8sVersionExpirationForShoot,
  expiringWorkerGroupsForShoot,
  getDateFormatted,
  isShootHasNoHibernationScheduleWarning,
  isSelfTerminationWarning,
  isValidTerminationDate
} from '@/utils'
import { mapGetters } from 'vuex'

export default {
  name: 'VerisonUpdateWarning',
  components: {
    TimeString,
    GPopper
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
        this.constraintWarnings.length
      )
    },
    icon () {
      const icons = []
      if (this.isK8sWarning || this.isMachineImageWarning) {
        icons.push('mdi-update')
      }
      if (this.isNoHibernationScheduleWarning) {
        icons.push('mdi-calendar-alert')
      }
      if (this.isClusterExpirationWarning) {
        if (this.isClusterExpirationWarningState) {
          icons.push('mdi-clock-alert-outline')
        } else {
          icons.push('mdi-clock-outline')
        }
      }
      if (this.constraintWarnings.length) {
        icons.push('mdi-alert-circle-outline')
      }
      if (icons.length === 1) {
        return icons[0]
      }

      if (this.overallStatus === 'info') {
        return 'mdi-information-outline'
      }
      return 'mdi-alert-circle-outline'
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
    purposeText () {
      return this.shootPurpose || ''
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
    isValidTerminationDate () {
      return isValidTerminationDate(this.shootExpirationTimestamp)
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

    overallStatus () {
      let isError
      let isWarning
      if (this.isK8sWarning) {
        isError = this.k8sExpiration.isError
        isWarning = this.k8sExpiration.isWarning
      }
      if (this.isMachineImageWarning) {
        isError = some(this.expiredWorkerGroups, { isError: true })
        isWarning = some(this.expiredWorkerGroups, { isWarning: true })
      }
      if (this.isClusterExpirationWarning) {
        isWarning = isWarning || this.isClusterExpirationWarningState
      }
      if (this.constraintWarnings.length) {
        isWarning = true
      }

      if (isError) {
        return 'error'
      }
      if (isWarning) {
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
    getDateFormatted (date) {
      return getDateFormatted(date)
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
