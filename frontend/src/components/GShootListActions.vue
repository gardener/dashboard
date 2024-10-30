//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

<template>
  <v-dialog
    v-if="!!shootUid"
    v-model="accessDialog"
    persistent
    max-width="850"
  >
    <v-card>
      <g-toolbar>
        Cluster Access
        <code class="text-toolbar-title">
          {{ shootName }}
        </code>
        <template #append>
          <v-btn
            variant="text"
            density="comfortable"
            icon="mdi-close"
            color="toolbar-title"
            @click.stop="accessDialog = false"
          />
        </template>
      </g-toolbar>
      <g-shoot-access-card
        ref="clusterAccess"
        :selected-shoot="shootActionItem"
        :hide-terminal-shortcuts="true"
      />
    </v-card>
  </v-dialog>
  <v-menu
    v-model="actionMenu"
    location="left"
    :close-on-content-click="false"
    eager
    :target="shootActionTarget"
  >
    <v-list
      dense
      @click.capture="actionMenu = false"
    >
      <v-list-item>
        <g-shoot-action-change-hibernation
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-maintenance-start
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-reconcile-start
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-action-rotate-credentials
          type="ALL_CREDENTIALS"
          text
        />
      </v-list-item>
      <v-list-item>
        <g-shoot-version-configuration
          text
        />
      </v-list-item>
      <v-divider />
      <v-list-item>
        <g-shoot-action-delete-cluster
          v-if="!canForceDeleteShoot"
          text
        />
        <g-shoot-action-force-delete
          v-else
          text
        />
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import GShootAccessCard from '@/components/ShootDetails/GShootAccessCard.vue'
import GShootActionChangeHibernation from '@/components/ShootHibernation/GShootActionChangeHibernation.vue'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart.vue'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart.vue'
import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials.vue'
import GShootActionDeleteCluster from '@/components/GShootActionDeleteCluster.vue'
import GShootActionForceDelete from '@/components/GShootActionForceDelete.vue'
import GShootVersionConfiguration from '@/components/ShootVersion/GShootVersionConfiguration.vue'

import { useProvideShootItem } from '@/composables/useShootItem'
import { useShootAction } from '@/composables/useShootAction'

const {
  shootActionItem,
  shootActionTarget,
  createShootActionFlag,
} = useShootAction()

const {
  shootName,
  shootUid,
  canForceDeleteShoot,
} = useProvideShootItem(shootActionItem)

const accessDialog = createShootActionFlag('access')
const actionMenu = createShootActionFlag('menu')
</script>
