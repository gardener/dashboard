<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <g-toolbar title="Lifecycle" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-sleep
          </v-icon>
        </template>
        <g-list-item-content>
          Hibernation
          <template #description>
            <div class="d-flex align-center pt-1">
              <g-shoot-messages
                :shoot-item="shootItem"
                :filter="['no-hibernation-schedule', 'hibernation-constraint']"
                small
                class="mr-1"
              />
              {{ hibernationDescription }}
            </div>
          </template>
        </g-list-item-content>
        <template #append>
          <g-shoot-action-change-hibernation
            v-model="changeHibernationDialog"
            :shoot-item="shootItem"
            dialog
            button
          />
          <g-hibernation-configuration
            ref="hibernationConfiguration"
            :shoot-item="shootItem"
          />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-wrench-outline
          </v-icon>
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
              class="ml-1"
            />
          </div>
          <template #description>
            <v-tooltip location="top">
              <template #activator="{ props }">
                <div
                  class="d-flex align-center"
                  v-bind="props"
                >
                  <g-shoot-messages
                    :shoot-item="shootItem"
                    filter="maintenance-constraint"
                    small
                    class="mr-1"
                  />
                  <span v-if="isInMaintenanceWindow">
                    Cluster is currently within the maintenance time window
                    <span v-if="nextMaintenanceEndTimestamp">
                      . The maintenance time window ends
                      <g-time-string
                        :date-time="nextMaintenanceEndTimestamp"
                        no-tooltip
                      />
                    </span>
                  </span>
                  <span v-else-if="nextMaintenanceBeginTimestamp">
                    Maintenance time window starts
                    <g-time-string
                      :date-time="nextMaintenanceBeginTimestamp"
                      no-tooltip
                    />
                  </span>
                </div>
              </template>
              <div>{{ maintenanceTooltipBegin }}</div>
              <div>{{ maintenanceTooltipEnd }}</div>
            </v-tooltip>
          </template>
        </g-list-item-content>
        <template #append>
          <g-shoot-action-maintenance-start
            v-model="maintenanceStartDialog"
            :shoot-item="shootItem"
            dialog
            button
          />
          <g-maintenance-configuration
            :shoot-item="shootItem"
          />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-tractor
          </v-icon>
        </template>
        <g-list-item-content>
          Reconcile
          <template #description>
            {{ reconcileDescription }}
          </template>
        </g-list-item-content>
        <template #append>
          <g-shoot-action-reconcile-start
            v-model="reconcileStartDialog"
            :shoot-item="shootItem"
          />
        </template>
      </g-list-item>
      <template v-if="canPatchShoots">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-delete-circle-outline
            </v-icon>
          </template>
          <g-list-item-content>
            Delete Cluster
          </g-list-item-content>
          <template #append>
            <g-shoot-action-delete-cluster
              v-model="deleteClusterDialog"
              :shoot-item="shootItem"
            />
          </template>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>
<script>
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'
import { useAuthzStore } from '@/store/authz'

import GShootActionChangeHibernation from '@/components/ShootHibernation/GShootActionChangeHibernation'
import GShootActionDeleteCluster from '@/components/GShootActionDeleteCluster'
import GHibernationConfiguration from '@/components/ShootHibernation/GHibernationConfiguration'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart'
import GMaintenanceConfiguration from '@/components/ShootMaintenance/GMaintenanceConfiguration'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart'
import GShootMessages from '@/components/ShootMessages/GShootMessages'
import GTimeString from '@/components/GTimeString'

import TimeWithOffset from '@/utils/TimeWithOffset'
import moment from '@/utils/moment'
import { shootItem } from '@/mixins/shootItem'

import { get } from '@/lodash'

export default {
  components: {
    GShootActionChangeHibernation,
    GShootActionMaintenanceStart,
    GMaintenanceConfiguration,
    GHibernationConfiguration,
    GShootActionDeleteCluster,
    GShootActionReconcileStart,
    GShootMessages,
    GTimeString,
  },
  mixins: [shootItem],
  data () {
    return {
      changeHibernationDialog: false,
      maintenanceStartDialog: false,
      reconcileStartDialog: false,
      deleteClusterDialog: false,
    }
  },
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
