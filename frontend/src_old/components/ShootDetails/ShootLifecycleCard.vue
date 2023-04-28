<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Lifecycle</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-sleep</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Hibernation</v-list-item-title>
          <v-list-item-subtitle class="d-flex align-center pt-1">
            <shoot-messages :shoot-item="shootItem" :filter="['no-hibernation-schedule', 'hibernation-constraint']" small class="mr-1" />
            {{hibernationDescription}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <change-hibernation :shoot-item="shootItem"></change-hibernation>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <hibernation-configuration ref="hibernationConfiguration" :shoot-item="shootItem"></hibernation-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-wrench-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title class="d-flex align-center">
            Maintenance
            <shoot-messages
            :shoot-item="shootItem"
            filter="last-maintenance"
            show-verbose
            title="Last Maintenance Status"
            small
            class="ml-1" />
          </v-list-item-title>
          <v-list-item-subtitle>
            <v-tooltip location="top">
              <template v-slot:activator="{ on }">
                <div class="d-flex align-center pt-1" v-on="on">
                  <shoot-messages :shoot-item="shootItem" filter="maintenance-constraint" small class="mr-1" />
                  <span v-if="isInMaintenanceWindow">
                    Cluster is currently within the maintenance time window<span v-if="nextMaintenanceEndTimestamp">. The maintenance time window ends <time-string :date-time="nextMaintenanceEndTimestamp" no-tooltip></time-string></span>
                  </span>
                  <span v-else-if="nextMaintenanceBeginTimestamp">
                    Maintenance time window starts
                    <time-string :date-time="nextMaintenanceBeginTimestamp" no-tooltip></time-string>
                  </span>
                </div>
              </template>
              <div>{{maintenanceTooltipBegin}}</div>
              <div>{{maintenanceTooltipEnd}}</div>
            </v-tooltip>
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <maintenance-start :shoot-item="shootItem"></maintenance-start>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <maintenance-configuration :shoot-item="shootItem"></maintenance-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-tractor</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Reconcile</v-list-item-title>
          <v-list-item-subtitle class="pt-1">
            {{reconcileDescription}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <reconcile-start :shoot-item="shootItem"></reconcile-start>
        </v-list-item-action>
      </v-list-item>
      <template v-if="canPatchShoots">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-delete-circle-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              Delete Cluster
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <delete-cluster :shoot-item="shootItem"></delete-cluster>
          </v-list-item-action>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>
<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'

import ChangeHibernation from '@/components/ShootHibernation/ChangeHibernation.vue'
import DeleteCluster from '@/components/DeleteCluster.vue'
import HibernationConfiguration from '@/components/ShootHibernation/HibernationConfiguration.vue'
import MaintenanceStart from '@/components/ShootMaintenance/MaintenanceStart.vue'
import MaintenanceConfiguration from '@/components/ShootMaintenance/MaintenanceConfiguration.vue'
import ReconcileStart from '@/components/ReconcileStart.vue'
import ShootMessages from '@/components/ShootMessages/ShootMessages.vue'
import TimeString from '@/components/TimeString.vue'

import TimeWithOffset from '@/utils/TimeWithOffset'
import moment from '@/utils/moment'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ChangeHibernation,
    MaintenanceStart,
    MaintenanceConfiguration,
    HibernationConfiguration,
    DeleteCluster,
    ReconcileStart,
    ShootMessages,
    TimeString
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'canPatchShoots',
      'isShootHasNoHibernationScheduleWarning'
    ]),
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
    }
  },
  methods: {
    showHibernationConfigurationDialog () {
      this.$refs.hibernationConfiguration.showDialog()
    }
  }
}
</script>
