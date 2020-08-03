<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-card>
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">Lifecycle</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">mdi-sleep</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Hibernation</v-list-item-title>
          <v-list-item-subtitle class="d-flex align-center pt-1">
            <v-icon
              v-if="isShootHasNoHibernationScheduleWarning && !isShootStatusHibernationProgressing && !isShootMarkedForDeletion"
              small
              class="pr-1"
              color="cyan darken-2"
            >mdi-calendar-alert</v-icon>
            <v-progress-circular v-if="isShootStatusHibernationProgressing"
              indeterminate
              size="12"
              width="2"
              color="grey"
              class="mr-1"
            ></v-progress-circular>
            {{hibernationDescription}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <change-hibernation :shootItem="shootItem"></change-hibernation>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <hibernation-configuration ref="hibernationConfiguration" :shootItem="shootItem"></hibernation-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">mdi-wrench-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Maintenance</v-list-item-title>
          <v-list-item-subtitle class="pt-1">
            {{maintenanceDescription}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <maintenance-start :shootItem="shootItem"></maintenance-start>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <maintenance-configuration :shootItem="shootItem"></maintenance-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">mdi-tractor</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Reconcile</v-list-item-title>
          <v-list-item-subtitle class="pt-1">
            {{reconcileDescription}}
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <reconcile-start :shootItem="shootItem"></reconcile-start>
        </v-list-item-action>
      </v-list-item>
      <template v-if="canPatchShoots">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-badge color="white" overlap bottom>
              <template v-slot:badge>
                <v-icon color="cyan darken-2">mdi-refresh</v-icon>
              </template>
              <v-icon color="cyan darken-2">mdi-file</v-icon>
            </v-badge>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              Rotate Kubeconfig
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <rotate-kubeconfig-start :shootItem="shootItem"></rotate-kubeconfig-start>
          </v-list-item-action>
        </v-list-item>
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="cyan darken-2">mdi-delete-circle-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>
              Delete Cluster
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <delete-cluster :shootItem="shootItem"></delete-cluster>
          </v-list-item-action>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import moment from 'moment-timezone'
import { isShootHasNoHibernationScheduleWarning } from '@/utils'
import ChangeHibernation from '@/components/ShootHibernation/ChangeHibernation'
import MaintenanceStart from '@/components/ShootMaintenance/MaintenanceStart'
import MaintenanceConfiguration from '@/components/ShootMaintenance/MaintenanceConfiguration'
import HibernationConfiguration from '@/components/ShootHibernation/HibernationConfiguration'
import DeleteCluster from '@/components/DeleteCluster'
import ReconcileStart from '@/components/ReconcileStart'
import RotateKubeconfigStart from '@/components/RotateKubeconfigStart'
import { shootItem } from '@/mixins/shootItem'
export default {
  components: {
    ChangeHibernation,
    MaintenanceStart,
    MaintenanceConfiguration,
    HibernationConfiguration,
    DeleteCluster,
    ReconcileStart,
    RotateKubeconfigStart
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapState([
      'localTimezone'
    ]),
    ...mapGetters([
      'canPatchShoots'
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
      } else if (this.isShootHasNoHibernationScheduleWarning) {
        return this.canPatchShoots ? `Please configure a schedule for this ${purpose} cluster` : `A schedule should be configured for this ${purpose} cluster`
      } else {
        return 'No hibernation schedule configured'
      }
    },
    maintenanceDescription () {
      const timezone = this.localTimezone
      const maintenanceStart = get(this.shootMaintenance, 'timeWindow.begin')
      const momentObj = moment.tz(maintenanceStart, 'HHmmZ', timezone)
      if (momentObj.isValid()) {
        const maintenanceStr = momentObj.format('HH:mm')
        return `Start time: ${maintenanceStr} ${timezone}`
      }
      return ''
    },
    isShootHasNoHibernationScheduleWarning () {
      return isShootHasNoHibernationScheduleWarning(this.shootItem)
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
