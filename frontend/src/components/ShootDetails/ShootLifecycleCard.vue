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
          <v-list-item-title>Maintenance</v-list-item-title>
          <v-list-item-subtitle class="d-flex align-center pt-1">
            <shoot-messages :shoot-item="shootItem" filter="maintenance-constraint" small class="mr-1" />
            {{maintenanceDescription}}
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

import ChangeHibernation from '@/components/ShootHibernation/ChangeHibernation'
import DeleteCluster from '@/components/DeleteCluster'
import HibernationConfiguration from '@/components/ShootHibernation/HibernationConfiguration'
import MaintenanceStart from '@/components/ShootMaintenance/MaintenanceStart'
import MaintenanceConfiguration from '@/components/ShootMaintenance/MaintenanceConfiguration'
import ReconcileStart from '@/components/ReconcileStart'
import ShootMessages from '@/components/ShootMessages/ShootMessages'

import TimeWithOffset from '@/utils/TimeWithOffset'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ChangeHibernation,
    MaintenanceStart,
    MaintenanceConfiguration,
    HibernationConfiguration,
    DeleteCluster,
    ReconcileStart,
    ShootMessages
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
    maintenanceDescription () {
      const maintenanceStart = get(this.shootMaintenance, 'timeWindow.begin')
      const maintenanceStartTime = new TimeWithOffset(maintenanceStart)
      if (!maintenanceStartTime.isValid()) {
        return
      }

      return `Start time: ${maintenanceStartTime.toString()}`
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
