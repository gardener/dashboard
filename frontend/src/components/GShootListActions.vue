//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

<template>
  <v-dialog
    v-if="!isShootItemEmpty"
    v-model="accessDialog"
    persistent
    max-width="850"
  >
    <v-card>
      <g-toolbar>
        Cluster Access
        <code class="text-toolbar-title">
          {{ currentName }}
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
        :selected-shoot="shootItem"
        :hide-terminal-shortcuts="true"
      />
    </v-card>
  </v-dialog>
  <v-menu
    v-model="actionMenu"
    location="left"
    :close-on-content-click="false"
    eager
    :target="actionMenu ? shootActionEventTarget : undefined"
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
import {
  computed,
  toRef,
} from 'vue'

import { useShootStore } from '@/store/shoot'

import GShootAccessCard from '@/components/ShootDetails/GShootAccessCard.vue'
import GShootActionChangeHibernation from '@/components/ShootHibernation/GShootActionChangeHibernation.vue'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart.vue'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart.vue'
import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials.vue'
import GShootActionDeleteCluster from '@/components/GShootActionDeleteCluster.vue'
import GShootActionForceDelete from '@/components/GShootActionForceDelete.vue'
import GShootVersionConfiguration from '@/components/ShootVersion/GShootVersionConfiguration.vue'

import { useProvideShootItem } from '@/composables/useShootItem'
import { useShootActionEvent } from '@/composables/useShootActionEvent'

import { get } from '@/lodash'

const shootStore = useShootStore()

const shootItem = toRef(shootStore, 'selectedShoot')

const {
  canForceDeleteShoot,
} = useProvideShootItem(shootItem)

const {
  shootActionEventName,
  shootActionEventTarget,
  clearShootActionEvent,
} = useShootActionEvent()

const accessDialog = computed({
  get () {
    return shootActionEventName.value === 'access'
  },
  set (value) {
    if (!value) {
      clearShootActionEvent()
    }
  },
})

const actionMenu = computed({
  get () {
    return shootActionEventName.value === 'menu'
  },
  set (value) {
    if (!value) {
      clearShootActionEvent()
    }
  },
})

const isShootItemEmpty = computed(() => {
  return !get(shootItem.value, ['metadata', 'uid'])
})

const currentName = computed(() => {
  return get(shootItem.value, ['metadata', 'name'])
})
</script>
