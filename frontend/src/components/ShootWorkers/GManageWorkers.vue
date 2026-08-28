<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="d-flex flex-column ga-6"
  >
    <template
      v-for="(worker, index) in providerWorkers"
      :key="index"
    >
      <v-divider v-if="index > 0" />
      <v-expand-transition
        :disabled="disableWorkerAnimation"
        @after-enter="el => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })"
      >
        <div
          class="pa-2 rounded"
          :class="index % 2 === 1 ? 'worker-group-even' : ''"
        >
          <g-worker-input-generic
            :worker="worker"
          >
            <template #action>
              <v-btn
                v-show="providerWorkers.length > 1"
                size="small"
                variant="tonal"
                color="error"
                prepend-icon="mdi-delete-outline"
                @click.stop="removeProviderWorker(index)"
              >
                Remove
              </v-btn>
            </template>
          </g-worker-input-generic>
        </div>
      </v-expand-transition>
    </template>
    <v-row
      key="addWorker"
      class="list-item my-0"
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

<style scoped>
.worker-group-even {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
