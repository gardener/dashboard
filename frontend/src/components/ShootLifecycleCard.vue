<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-card-title class="subheading white--text cyan darken-2 cardTitle">
      Lifecycle
    </v-card-title>
    <div class="list">
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-sleep</v-icon>
        <v-flex grow class="pa-0">
          <span class="subheading">Hibernation</span><br>
          <v-layout v-if="isShootHasNoHibernationScheduleWarning" align-center row fill-height class="ma-0">
            <v-icon small class="pr-1" color="cyan darken-2">mdi-calendar-alert</v-icon>
            <span class="grey--text">{{hibernationDescription}}</span>
          </v-layout>
          <span v-else class="grey--text">{{hibernationDescription}}</span>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <shoot-hibernation :shootItem="shootItem"></shoot-hibernation>
            <hibernation-configuration ref="hibernationConfiguration" :shootItem="shootItem"></hibernation-configuration>
          </v-layout>
        </v-flex>
      </v-card-title>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-wrench-outline</v-icon>
        <v-flex grow class="pa-0">
          <span class="subheading">Maintenance</span><br>
          <span class="grey--text">{{maintenanceDescription}}</span>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <maintenance-start :shootItem="shootItem"></maintenance-start>
            <maintenance-configuration :shootItem="shootItem"></maintenance-configuration>
          </v-layout>
        </v-flex>
      </v-card-title>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-tractor</v-icon>
        <v-flex grow class="pa-0">
          <span class="subheading">Reconcile</span><br>
          <span class="grey--text">{{reconcileDescription}}</span>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <reconcile-start :shootItem="shootItem"></reconcile-start>
          </v-layout>
        </v-flex>
      </v-card-title>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-delete-circle-outline</v-icon>
        <v-flex grow class="pa-0">
          <span class="subheading">Delete Cluster</span><br>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <delete-cluster :shootItem="shootItem"></delete-cluster>
          </v-layout>
        </v-flex>
      </v-card-title>
    </div>
  </v-card>
</template>

<script>

import { mapState } from 'vuex'
import get from 'lodash/get'
import moment from 'moment-timezone'
import { isShootHasNoHibernationScheduleWarning } from '@/utils'
import ShootHibernation from '@/components/ShootHibernation'
import MaintenanceStart from '@/components/MaintenanceStart'
import MaintenanceConfiguration from '@/components/MaintenanceConfiguration'
import HibernationConfiguration from '@/components/HibernationConfiguration'
import DeleteCluster from '@/components/DeleteCluster'
import ReconcileStart from '@/components/ReconcileStart'
import { shootGetters } from '@/mixins/shootGetters'

export default {
  components: {
    ShootHibernation,
    MaintenanceStart,
    MaintenanceConfiguration,
    HibernationConfiguration,
    DeleteCluster,
    ReconcileStart
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootGetters],
  computed: {
    ...mapState([
      'localTimezone'
    ]),
    hibernationDescription () {
      const purpose = this.shootPurpose || ''
      if (this.shootHibernationSchedules.length > 0) {
        return 'Hibernation schedule configured'
      } else if (this.isShootHasNoHibernationScheduleWarning) {
        return `Please configure a schedule for this ${purpose} cluster`
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

<style lang="styl" scoped>

  .cardTitle {
    line-height: 10px;
  }

  .listItem {
    padding-top: 0px;
    padding-bottom: 0px;
  }

  .list {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .avatar {
    padding-right: 33px;
  }

</style>
