<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="actionMenu"
    location="left"
    :close-on-content-click="false"
  >
    <template v-slot:activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-dots-vertical"
        tooltip="Cluster Actions"
      />
    </template>
    <v-list dense @click.capture="actionMenu = false">
      <v-list-item>
        <g-shoot-action-change-hibernation
          v-model="changeHibernationDialog"
          :shoot-item="shootItem"
          button
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-maintenance-start
          v-model="maintenanceStartDialog"
          :shoot-item="shootItem"
          button
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-reconcile-start
          v-model="reconcileStartDialog"
          :shoot-item="shootItem"
          button
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-rotate-credentials
          v-model="rotateCredentialsDialog"
          :shoot-item="shootItem"
          :type="rotationType"
          button
          text
        />
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item>
        <g-shoot-action-delete-cluster
          v-model="deleteClusterDialog"
          :shoot-item="shootItem"
          button
          text
        />
      </v-list-item>
    </v-list>
  </v-menu>
  <g-shoot-action-change-hibernation
    v-model="changeHibernationDialog"
    :shoot-item="shootItem"
    dialog
  />
  <g-shoot-action-maintenance-start
    v-model="maintenanceStartDialog"
    :shoot-item="shootItem"
    dialog
  />
  <g-shoot-action-reconcile-start
    v-model="reconcileStartDialog"
    :shoot-item="shootItem"
    dialog
  />
  <g-shoot-action-rotate-credentials
    v-model="rotateCredentialsDialog"
    :shoot-item="shootItem"
    :type="rotationType"
    dialog
  />
  <g-shoot-action-delete-cluster
    v-model="deleteClusterDialog"
    :shoot-item="shootItem"
    dialog
  />
</template>

<script>
import GActionButton from '@/components/GActionButton.vue'
import GShootActionChangeHibernation from '@/components/ShootHibernation/GShootActionChangeHibernation.vue'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart.vue'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart.vue'
import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials.vue'
import GShootActionDeleteCluster from '@/components/GShootActionDeleteCluster.vue'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GActionButton,
    GShootActionChangeHibernation,
    GShootActionMaintenanceStart,
    GShootActionReconcileStart,
    GShootActionRotateCredentials,
    GShootActionDeleteCluster,
  },
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object,
    },
  },
  data () {
    return {
      menu: false,
      reconcileStartDialog: false,
      changeHibernationDialog: false,
      maintenanceStartDialog: false,
      rotateCredentialsDialog: false,
      deleteClusterDialog: false,
      rotationType: 'ALL_CREDENTIALS',
    }
  },
  computed: {
    actionMenu: {
      get () {
        return this.menu
      },
      set (value) {
        this.menu = value
      },
    },
  },
}
</script>
