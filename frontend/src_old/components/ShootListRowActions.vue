<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu :nudge-bottom="20" location="left" v-model="actionMenu" absolute :close-on-content-click="false" v-if="canPatchShoots">
    <template v-slot:activator="{ on: menu }">
      <v-tooltip location="top">
        <template v-slot:activator="{ on: tooltip }">
          <v-btn v-on="{ ...menu, ...tooltip}" icon class="action-button--text">
            <v-icon class="cursor-pointer">mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        Cluster Actions
      </v-tooltip>
    </template>
    <v-list subheader dense class="actionMenuItem" @click.capture="actionMenu=false">
      <v-list-item>
        <v-list-item-content>
          <change-hibernation :shoot-item="shootItem" text></change-hibernation>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <maintenance-start :shoot-item="shootItem" text></maintenance-start>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <reconcile-start :shoot-item="shootItem" text></reconcile-start>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <rotate-credentials :shoot-item="shootItem" type="ALL_CREDENTIALS" text></rotate-credentials>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item>
        <v-list-item-content>
            <delete-cluster :shoot-item="shootItem" text></delete-cluster>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { mapGetters } from 'vuex'

import ChangeHibernation from '@/components/ShootHibernation/ChangeHibernation.vue'
import DeleteCluster from '@/components/DeleteCluster.vue'
import MaintenanceStart from '@/components/ShootMaintenance/MaintenanceStart.vue'
import ReconcileStart from '@/components/ReconcileStart.vue'
import RotateCredentials from '@/components/RotateCredentials.vue'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ChangeHibernation,
    MaintenanceStart,
    ReconcileStart,
    RotateCredentials,
    DeleteCluster
  },
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      actionMenu: false
    }
  },
  computed: {
    ...mapGetters([
      'canPatchShoots'
    ])
  }
}

</script>
