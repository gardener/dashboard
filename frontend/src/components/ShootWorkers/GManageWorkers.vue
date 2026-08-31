<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    ref="containerRef"
    class="d-flex flex-column"
  >
    <div class="d-flex justify-end mb-6">
      <v-btn
        variant="text"
        size="small"
        @click="toggleCollapseAll"
      >
        {{ allCollapsed ? 'Expand all' : 'Collapse all' }}
      </v-btn>
    </div>
    <v-expand-transition
      group
      :disabled="disableWorkerAnimation"
    >
      <div
        v-for="(worker, index) in providerWorkers"
        :key="worker._uid"
        :ref="element => { if (element) workerGroupRefs[worker._uid] = element }"
        class="worker-group-wrapper"
      >
        <div
          class="worker-group-card rounded pa-3 mb-6"
          :class="index % 2 === 1 ? 'worker-group-even' : ''"
        >
          <div
            class="d-flex align-center py-1 cursor-pointer"
            @click="setCollapsed(worker._uid, !collapsedWorkers[worker._uid])"
          >
            <v-icon
              :icon="collapsedWorkers[worker._uid] ? 'mdi-chevron-right' : 'mdi-chevron-down'"
              size="small"
              class="text-medium-emphasis mr-1"
            />
            <span class="text-body-2 font-weight-medium">{{ worker.name }}</span>
            <span
              v-if="collapsedWorkers[worker._uid]"
              class="ml-3 text-body-2 text-medium-emphasis"
            >{{ worker.machine.architecture }} / {{ worker.machine.type }}</span>
            <v-spacer />
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
          </div>
          <v-expand-transition
            :disabled="disableWorkerAnimation"
            @after-enter="() => scrollToWorker(worker._uid)"
          >
            <div
              v-if="!collapsedWorkers[worker._uid]"
              class="pt-3"
            >
              <g-worker-input-generic
                :worker="worker"
              />
            </div>
          </v-expand-transition>
        </div>
      </div>
    </v-expand-transition>
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
import {
  ref,
  computed,
  toRefs,
  nextTick,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from 'vue'

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
  removeProviderWorker: removeProviderWorkerFromContext,
} = useShootContext()

function removeProviderWorker (index) {
  const uid = providerWorkers.value.index?._uid
  if (uid) {
    delete workerGroupRefs.uid
  }
  lastInteracted = null
  removeProviderWorkerFromContext(index)
}

const collapsedWorkers = ref({})
const workerGroupRefs = {}
const containerRef = useTemplateRef('containerRef')
let lastInteracted = null

const allCollapsed = computed(() =>
  providerWorkers.value.length > 0 &&
  providerWorkers.value.every(worker => collapsedWorkers.value[worker._uid]),
)

function scrollToWorker (uid) {
  nextTick(() => workerGroupRefs.uid?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function setCollapsed (uid, value) {
  collapsedWorkers.value = { ...collapsedWorkers.value, [uid]: value }
  lastInteracted = uid
  if (value) {
    scrollToWorker(uid)
  }
}

function toggleCollapseAll () {
  if (allCollapsed.value) {
    collapsedWorkers.value = {}
  } else {
    collapsedWorkers.value = Object.fromEntries(
      providerWorkers.value.map(worker => [worker._uid, true]),
    )
  }
}

let resizeObserver = null

onMounted(() => {
  if (!containerRef.value) {
    return
  }
  resizeObserver = new ResizeObserver(() => {
    if (lastInteracted) {
      scrollToWorker(lastInteracted)
    }
  })
  resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.worker-group-even {
  background-color: rgba(0, 0, 0, 0.04);
}

.worker-group-wrapper {
  overflow: hidden;
}

.worker-group-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
