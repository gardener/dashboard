<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu :nudge-bottom="20" left v-model="actionMenu" absolute :close-on-content-click="false" v-if="canPatchShoots">
    <template v-slot:activator="{ on: menu }">
      <v-tooltip top>
        <template v-slot:activator="{ on: tooltip }">
          <v-btn v-on="{ ...menu, ...tooltip}" icon class="cyan--text text--darken-2">
            <v-icon class="cursor-pointer">mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        Cluster Actions
      </v-tooltip>
    </template>
    <v-list subheader dense class="actionMenuItem" @click.native.capture="actionMenu=false">
      <v-list-item>
        <v-list-item-content>
          <change-hibernation :shootItem="shootItem" text></change-hibernation>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <maintenance-start :shootItem="shootItem" text></maintenance-start>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <reconcile-start :shootItem="shootItem" text></reconcile-start>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <rotate-kubeconfig-start :shootItem="shootItem" text></rotate-kubeconfig-start>
        </v-list-item-content>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item>
        <v-list-item-content>
            <delete-cluster :shootItem="shootItem" text></delete-cluster>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { mapGetters } from 'vuex'

import ChangeHibernation from '@/components/ShootHibernation/ChangeHibernation'
import DeleteCluster from '@/components/DeleteCluster'
import MaintenanceStart from '@/components/ShootMaintenance/MaintenanceStart'
import ReconcileStart from '@/components/ReconcileStart'
import RotateKubeconfigStart from '@/components/RotateKubeconfigStart'

export default {
  components: {
    ChangeHibernation,
    MaintenanceStart,
    ReconcileStart,
    RotateKubeconfigStart,
    DeleteCluster
  },
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
