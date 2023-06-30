<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <g-toolbar title="Lifecycle" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">mdi-sleep</v-icon>
        </template>
        <g-list-item-content>
          Hibernation
          <template #description>
            <div class="d-flex align-center pt-1">
              <g-shoot-messages :shoot-item="shootItem" :filter="['no-hibernation-schedule', 'hibernation-constraint']" small class="mr-1" />
              {{ hibernationDescription }}
            </div>
          </template>
        </g-list-item-content>
        <template #append>
          <g-change-hibernation :shoot-item="shootItem"></g-change-hibernation>
          <g-hibernation-configuration ref="hibernationConfiguration" :shoot-item="shootItem"></g-hibernation-configuration>
        </template>
      </g-list-item>
      <v-divider inset></v-divider>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">mdi-wrench-outline</v-icon>
        </template>
        <g-list-item-content>
          <div class="d-flex align-center">
            Maintenance
            <g-shoot-messages
            :shoot-item="shootItem"
            filter="last-maintenance"
            show-verbose
            title="Last Maintenance Status"
            small
            class="ml-1" />
          </div>
          <template #description>
            <v-tooltip top>
              <template #activator="{ props }">
                <div class="d-flex align-center pt-1" v-bind="props">
                  <g-shoot-messages :shoot-item="shootItem" filter="maintenance-constraint" small class="mr-1" />
                  <span v-if="isInMaintenanceWindow">
                    Cluster is currently within the maintenance time window<span v-if="nextMaintenanceEndTimestamp">. The maintenance time window ends <g-time-string :date-time="nextMaintenanceEndTimestamp" no-tooltip></g-time-string></span>
                  </span>
                  <span v-else-if="nextMaintenanceBeginTimestamp">
                    Maintenance time window starts
                    <g-time-string :date-time="nextMaintenanceBeginTimestamp" no-tooltip></g-time-string>
                  </span>
                </div>
              </template>
              <div>{{maintenanceTooltipBegin}}</div>
              <div>{{maintenanceTooltipEnd}}</div>
            </v-tooltip>
          </template>
        </g-list-item-content>
        <template #append>
          <g-maintenance-start :shoot-item="shootItem"></g-maintenance-start>
          <g-maintenance-configuration :shoot-item="shootItem"></g-maintenance-configuration>
        </template>
      </g-list-item>
      <v-divider inset></v-divider>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">mdi-tractor</v-icon>
        </template>
        <g-list-item-content>
          Reconcile
          <template #description>
            {{reconcileDescription}}
          </template>
        </g-list-item-content>
        <template #append>
          <g-reconcile-start :shoot-item="shootItem"></g-reconcile-start>
        </template>
      </g-list-item>
      <template v-if="canPatchShoots">
        <v-divider inset></v-divider>
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">mdi-delete-circle-outline</v-icon>
          </template>
          <g-list-item-content>
            Delete Cluster
          </g-list-item-content>
          <template #append>
            <g-delete-cluster :shoot-item="shootItem"></g-delete-cluster>
          </template>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>
<script>
import { mapState } from 'pinia'
import get from 'lodash/get'

import GChangeHibernation from '@/components/ShootHibernation/GChangeHibernation'
import GDeleteCluster from '@/components/GDeleteCluster'
import GHibernationConfiguration from '@/components/ShootHibernation/GHibernationConfiguration'
import GMaintenanceStart from '@/components/ShootMaintenance/GMaintenanceStart'
import GMaintenanceConfiguration from '@/components/ShootMaintenance/GMaintenanceConfiguration'
import GReconcileStart from '@/components/GReconcileStart'
import GShootMessages from '@/components/ShootMessages/GShootMessages'
import GTimeString from '@/components/GTimeString'

import TimeWithOffset from '@/utils/TimeWithOffset'
import moment from '@/utils/moment'

import { shootItem } from '@/mixins/shootItem'

import {
  useConfigStore,
  useAuthzStore,
} from '@/store'

export default {
  components: {
    GChangeHibernation,
    GMaintenanceStart,
    GMaintenanceConfiguration,
    GHibernationConfiguration,
    GDeleteCluster,
    GReconcileStart,
    GShootMessages,
    GTimeString,
  },
  mixins: [shootItem],
  computed: {
    ...mapState(useAuthzStore, ['canPatchShoots']),
    ...mapState(useConfigStore, ['isShootHasNoHibernationScheduleWarning']),
    hibernationDescription () {
      if (this.isShootStatusHibernationProgressing) {
        if (this.isShootSettingHibernated) {
          return 'Hibernating Cluster...'
        } else {
          return 'Waking up Cluster...'
        }
      }
      const purpose = this.shootPurpose || ''
      if (this.shootHibernationSchedules.length > 0) {
        return 'Hibernation schedule configured'
      } else if (this.isShootHasNoHibernationScheduleWarning(this.shootItem)) {
        return this.canPatchShoots ? `Please configure a schedule for this ${purpose} cluster` : `A schedule should be configured for this ${purpose} cluster`
      } else {
        return 'No hibernation schedule configured'
      }
    },
    maintenanceTooltipBegin () {
      const maintenanceStart = get(this.shootMaintenance, 'timeWindow.begin')
      const maintenanceStartTime = new TimeWithOffset(maintenanceStart)
      if (!maintenanceStartTime.isValid()) {
        return
      }

      return `Start time: ${maintenanceStartTime.toString()}`
    },
    maintenanceTooltipEnd () {
      const maintenanceStart = get(this.shootMaintenance, 'timeWindow.end')
      const maintenanceStartTime = new TimeWithOffset(maintenanceStart)
      if (!maintenanceStartTime.isValid()) {
        return
      }

      return `End time: ${maintenanceStartTime.toString()}`
    },
    nextMaintenanceBeginTimestamp () {
      const maintenanceStart = get(this.shootMaintenance, 'timeWindow.begin')
      const maintenanceStartTime = new TimeWithOffset(maintenanceStart)
      if (!maintenanceStartTime.isValid()) {
        return
      }

      return maintenanceStartTime.nextDate().toISOString()
    },
    nextMaintenanceEndTimestamp () {
      const maintenanceEnd = get(this.shootMaintenance, 'timeWindow.end')
      const maintenanceEndTime = new TimeWithOffset(maintenanceEnd)
      if (!maintenanceEndTime.isValid()) {
        return
      }

      return maintenanceEndTime.nextDate().toISOString()
    },
    isInMaintenanceWindow () {
      return moment(this.nextMaintenanceBeginTimestamp).isAfter(this.nextMaintenanceEndTimestamp)
    },
    reconcileDescription () {
      if (this.isShootReconciliationDeactivated) {
        return 'Reconciliation deactivated'
      } else {
        return 'Cluster reconciliation will be triggered regularly'
      }
    },
  },
  methods: {
    showHibernationConfigurationDialog () {
      this.$refs.hibernationConfiguration.showDialog()
    },
  },
}
</script>
