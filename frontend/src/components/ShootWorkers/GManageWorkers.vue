<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="alternate-row-background"
  >
    <g-expand-transition-group :disabled="disableWorkerAnimation">
      <v-row
        v-for="(worker, index) in providerWorkers"
        :key="index"
        class="list-item"
      >
        <g-worker-input-generic
          :worker="worker"
        >
          <template #action>
            <v-btn
              v-show="providerWorkers.length > 1"
              size="x-small"
              variant="tonal"
              icon="mdi-close"
              color="grey"
              @click.stop="removeProviderWorker(index)"
            />
          </template>
        </g-worker-input-generic>
      </v-row>
    </g-expand-transition-group>
    <v-row
      key="addWorker"
      class="list-item my-1"
    >
      <v-col>
        <v-btn
          :disabled="!allMachineTypes.length"
          variant="text"
          color="primary"
          @click="addProviderWorker"
        >
          <v-icon class="text-primary">
            mdi-plus
          </v-icon>
          Add Worker Group
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { toRefs } from 'vue'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'

import { useShootContext } from '@/composables/useShootContext'

const props = defineProps({
  disableWorkerAnimation: {
    type: Boolean,
    default: false,
  },
})
const { disableWorkerAnimation } = toRefs(props)

const {
  providerWorkers,
  workerless,
  allMachineTypes,
  addProviderWorker,
  removeProviderWorker,
} = useShootContext()
</script>
