<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
  >
    <v-expand-transition
      group
      :disabled="disableWorkerAnimation"
    >
      <div
        v-for="(worker, index) in providerWorkers"
        :key="index"
        class="mb-4"
      >
        <g-worker-input-generic
          :worker="worker"
          :worker-index="index"
        >
          <template #action>
            <v-btn
              v-show="providerWorkers.length > 1"
              variant="text"
              prepend-icon="mdi-delete-outline"
              color="error"
              @click.stop="removeProviderWorker(index)"
            >
              Remove
            </v-btn>
          </template>
        </g-worker-input-generic>
      </div>
    </v-expand-transition>
    <div
      key="addWorker"
      class="mt-2"
    >
      <v-btn
        :disabled="!allMachineTypes.length"
        variant="text"
        prepend-icon="mdi-plus"
        color="primary"
        @click="addProviderWorker"
      >
        Add Worker Group
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { toRefs } from 'vue'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'

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
