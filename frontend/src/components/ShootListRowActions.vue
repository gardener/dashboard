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
