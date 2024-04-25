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
          <div class="d-flex align-center">
            Hibernation
            <g-shoot-messages
              :filter="['no-hibernation-schedule', 'hibernation-constraint']"
              small
            />
          </div>
          <template #description>
            {{ hibernationDescription }}
          </template>
        </g-list-item-content>
        <template #append>
          <g-shoot-action-change-hibernation
            v-model="changeHibernationDialog"
            dialog
            button
          />
          <g-hibernation-configuration
            ref="hibernationConfiguration"
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
              :filter="['last-maintenance', 'maintenance-constraint']"
              show-verbose
              title="Last Maintenance Status"
              small
            />
          </div>
          <template #description>
            <v-tooltip location="top">
              <template #activator="{ props }">
                <div
                  v-bind="props"
                >
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
            dialog
            button
          />
          <g-maintenance-configuration />
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
            <div class="d-flex align-center">
              Delete Cluster
              <g-shoot-messages
                filter="force-delete"
                show-verbose
                title="Cluster Deletion Failed"
                small
              />
            </div>
            <template #description>
              <span v-if="canForceDeleteShoot">
                Cluster deletion failed
              </span>
              <span v-else>
                Delete cluster and remove all ressources
              </span>
            </template>
          </g-list-item-content>
          <template #append>
            <g-shoot-action-delete-cluster
              v-if="!canForceDeleteShoot"
              v-model="deleteClusterDialog"
            />
            <g-shoot-action-force-delete
              v-else
              v-model="forceDeleteDialog"
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
import GShootActionForceDelete from '@/components/GShootActionForceDelete'
import GHibernationConfiguration from '@/components/ShootHibernation/GHibernationConfiguration'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart'
import GMaintenanceConfiguration from '@/components/ShootMaintenance/GMaintenanceConfiguration'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart'
import GShootMessages from '@/components/ShootMessages/GShootMessages'
import GTimeString from '@/components/GTimeString'

import { useShootItem } from '@/composables/useShootItem'

import TimeWithOffset from '@/utils/TimeWithOffset'
import moment from '@/utils/moment'

import { get } from '@/lodash'

export default {
  components: {
    GShootActionChangeHibernation,
    GShootActionMaintenanceStart,
    GMaintenanceConfiguration,
    GHibernationConfiguration,
    GShootActionDeleteCluster,
    GShootActionForceDelete,
    GShootActionReconcileStart,
    GShootMessages,
    GTimeString,
  },
  setup () {
    const shootItemState = useShootItem()

    return {
      ...shootItemState,
    }
  },
  data () {
    return {
      changeHibernationDialog: false,
      maintenanceStartDialog: false,
      reconcileStartDialog: false,
      deleteClusterDialog: false,
      forceDeleteDialog: false,
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
