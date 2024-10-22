<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="visible"
    location="left"
    :close-on-content-click="false"
    eager
    :activator="activator"
  >
    <v-list
      dense
      @click.capture="visible = false"
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
          :type="rotationType"
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
  toRefs,
  ref,
  computed,
} from 'vue'

import GShootActionChangeHibernation from '@/components/ShootHibernation/GShootActionChangeHibernation.vue'
import GShootActionMaintenanceStart from '@/components/ShootMaintenance/GShootActionMaintenanceStart.vue'
import GShootActionReconcileStart from '@/components/GShootActionReconcileStart.vue'
import GShootActionRotateCredentials from '@/components/GShootActionRotateCredentials.vue'
import GShootActionDeleteCluster from '@/components/GShootActionDeleteCluster.vue'
import GShootActionForceDelete from '@/components/GShootActionForceDelete.vue'
import GShootVersionConfiguration from '@/components/ShootVersion/GShootVersionConfiguration.vue'

import { useProvideShootItem } from '@/composables/useShootItem'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  selectedShoot: {
    type: Object,
  },
  activator: {
    type: Element,
  },
})

const { modelValue, selectedShoot, activator } = toRefs(props)

const emit = defineEmits([
  'update:modelValue',
])

const visible = computed({
  get () {
    return modelValue.value
  },
  set (value) {
    emit('update:modelValue', value)
  },
})

const {
  canForceDeleteShoot,
} = useProvideShootItem(selectedShoot)

const rotationType = ref('ALL_CREDENTIALS')
</script>
