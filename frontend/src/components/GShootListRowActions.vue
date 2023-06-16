<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu v-if="canPatchShoots"
    v-model="actionMenu"
    location="left"
    absolute
    :nudge-bottom="20"
    :close-on-content-click="false"
  >

    <template v-slot:activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-dots-vertical"
        tooltip="Cluster Actions"
      />
    </template>
    <v-list subheader dense class="actionMenuItem" @click.capture="actionMenu=false">
      <v-list-item>
        <g-change-hibernation :shoot-item="shootItem" text/>
      </v-list-item>
      <v-list-item>
        <g-maintenance-start :shoot-item="shootItem" text/>
      </v-list-item>
      <v-list-item>
        <g-reconcile-start :shoot-item="shootItem" text/>
      </v-list-item>
      <v-list-item>
        <g-rotate-credentials :shoot-item="shootItem" type="ALL_CREDENTIALS" text/>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item>
        <g-delete-cluster :shoot-item="shootItem" text/>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store'

import GActionButton from './GActionButton.vue'
import GChangeHibernation from '@/components/ShootHibernation/GChangeHibernation.vue'
import GDeleteCluster from '@/components/GDeleteCluster.vue'
import GMaintenanceStart from '@/components/ShootMaintenance/GMaintenanceStart.vue'
import GReconcileStart from '@/components/GReconcileStart.vue'
import GRotateCredentials from '@/components/GRotateCredentials.vue'

import { shootItem } from '@/mixins/shootItem'

export default defineComponent({
  components: {
    GActionButton,
    GChangeHibernation,
    GMaintenanceStart,
    GReconcileStart,
    GRotateCredentials,
    GDeleteCluster,
  },
  mixins: [shootItem],
  props: {
    shootItem: {
      type: Object,
    },
  },
  data () {
    return {
      actionMenu: false,
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'canPatchShoots',
    ]),
  },
})
</script>
