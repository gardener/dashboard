<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="d-flex flex-column"
  >
    <div
      v-if="providerWorkers.length > 1"
      class="d-flex justify-end mb-2"
    >
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
      @after-enter="scrollAddedWorkerGroup"
    >
      <div
        v-for="(worker, index) in providerWorkers"
        :key="worker._uid"
        :ref="element => { if (element) workerGroupRefs[worker._uid] = element }"
        class="worker-group-wrapper mb-4"
      >
        <v-expansion-panels
          :model-value="openWorkers[worker._uid] ? [worker._uid] : []"
          multiple
          @update:model-value="openPanels => setExpanded(worker._uid, !!openPanels.length)"
        >
          <v-expansion-panel
            :value="worker._uid"
          >
            <v-expansion-panel-title>
              <v-icon
                size="small"
                class="mr-2 flex-grow-0 flex-shrink-0"
              >
                {{ openWorkers[worker._uid] ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
              </v-icon>
              <span class="text-body-2 font-weight-medium">{{ worker.name }}</span>
              <template v-if="!openWorkers[worker._uid]">
                <template v-if="getCollapsedSummary(worker)">
                  <span class="mx-2 text-medium-emphasis">/</span>
                  <span class="d-inline-flex align-center">
                    <span class="text-body-2 text-medium-emphasis">{{ getCollapsedSummary(worker) }}</span>
                  </span>
                </template>
                <template v-if="worker.zones?.length">
                  <span class="mx-2 text-medium-emphasis">/</span>
                  <v-chip
                    v-for="zone in worker.zones.slice(0, 3)"
                    :key="zone"
                    size="x-small"
                    class="mr-1"
                  >
                    {{ zone }}
                  </v-chip>
                  <span
                    v-if="worker.zones.length > 3"
                    class="text-body-2 text-medium-emphasis"
                  >+{{ worker.zones.length - 3 }} more</span>
                </template>
              </template>
              <template #actions>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="tonal-info"
                  prepend-icon="mdi-content-copy"
                  class="mr-2"
                  :disabled="!allMachineTypes.length"
                  @click.stop="handleDuplicateProviderWorker(index)"
                >
                  Duplicate
                </v-btn>
                <v-btn
                  v-show="providerWorkers.length > 1"
                  size="small"
                  variant="tonal"
                  color="tonal-error"
                  prepend-icon="mdi-delete-outline"
                  class="mr-2"
                  @click.stop="removeProviderWorker(index)"
                >
                  Remove
                </v-btn>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <g-worker-input-generic
                :worker="worker"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
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
          @click="handleAddProviderWorker"
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
  watch,
  toRefs,
  nextTick,
} from 'vue'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'

import { useShootContext } from '@/composables/useShootContext'

const props = defineProps({
  disableWorkerAnimation: {
    type: Boolean,
    default: false,
  },
  scrollContainer: {
    type: HTMLElement,
    default: null,
  },
})
const { disableWorkerAnimation } = toRefs(props)

const {
  providerWorkers,
  workerless,
  allMachineTypes,
  machineImages,
  addProviderWorker,
  duplicateProviderWorker,
  removeProviderWorker: removeProviderWorkerFromContext,
} = useShootContext()

function getCollapsedSummary (worker) {
  const parts = []
  const machineLabel = [worker.machine?.architecture, worker.machine?.type].filter(Boolean).join(' / ')
  if (machineLabel) {
    parts.push(machineLabel)
  }

  const machineImageText = getMachineImageText(worker)
  if (machineImageText) {
    parts.push(machineImageText)
  }
  return parts.join(' / ')
}

function getMachineImageText (worker) {
  const { name, version } = worker.machine?.image ?? {}
  const image = machineImages.value.find(i => i.name === name && i.version === version)
  const imageName = image?.name ?? name
  const imageVersion = image?.version ?? version
  const baseText = [imageName, imageVersion].filter(Boolean).join(' ')
  if (!baseText) {
    return undefined
  }
  if (image?.isDeprecated) {
    return baseText + ' (deprecated)'
  }
  if (image?.isExpirationWarning) {
    return baseText + ' (expiring soon)'
  }
  return baseText
}

function removeProviderWorker (index) {
  const uid = providerWorkers.value[index]?._uid // eslint-disable-line security/detect-object-injection -- index from internal click handler
  if (uid) {
    delete workerGroupRefs[uid] // eslint-disable-line security/detect-object-injection -- uid from internal worker list
    delete openWorkers.value[uid] // eslint-disable-line security/detect-object-injection -- uid from internal worker list
  }
  removeProviderWorkerFromContext(index)
}

const openWorkers = ref({})
const workerGroupRefs = {}
let scrollOnEnter = false
let savedScrollTop = null

watch(providerWorkers, workers => {
  savedScrollTop = props.scrollContainer?.scrollTop ?? null
  const firstUid = workers[0]?._uid
  if (workers.length === 1 && firstUid && !(firstUid in openWorkers.value)) {
    openWorkers.value = { ...openWorkers.value, [firstUid]: true }
  }
  if (savedScrollTop !== null) {
    requestAnimationFrame(() => {
      if (props.scrollContainer) {
        props.scrollContainer.scrollTop = savedScrollTop
      }
      savedScrollTop = null
    })
  }
}, { immediate: true, flush: 'sync' })

const allCollapsed = computed(() =>
  providerWorkers.value.length > 0 &&
  providerWorkers.value.every(worker => !openWorkers.value[worker._uid]),
)

function scrollToWorker (uid) {
  nextTick(() => workerGroupRefs[uid]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })) // eslint-disable-line security/detect-object-injection -- uid from internal worker list
}

function scrollAddedWorkerGroup (element) {
  if (scrollOnEnter) {
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    scrollOnEnter = false
  }
}

function handleAddProviderWorker () {
  addProviderWorker()
  const uid = providerWorkers.value.at(-1)?._uid
  if (!uid) {
    return
  }
  openWorkers.value = { ...openWorkers.value, [uid]: true }
  scrollOnEnter = true
  nextTick(() => scrollToWorker(uid))
}

function handleDuplicateProviderWorker (index) {
  duplicateProviderWorker(index)
  const uid = providerWorkers.value[index + 1]?._uid
  if (!uid) {
    return
  }
  openWorkers.value = { ...openWorkers.value, [uid]: true }
  scrollOnEnter = true
  nextTick(() => scrollToWorker(uid))
}

function setExpanded (uid, isExpanded) {
  openWorkers.value = { ...openWorkers.value, [uid]: isExpanded }
  if (!isExpanded) {
    scrollToWorker(uid)
  }
}

function toggleCollapseAll () {
  if (allCollapsed.value) {
    openWorkers.value = Object.fromEntries(
      providerWorkers.value.map(worker => [worker._uid, true]),
    )
  } else {
    openWorkers.value = {}
  }
}

</script>
