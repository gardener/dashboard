<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!workerless"
    class="d-flex flex-column"
  >
    <v-expand-transition>
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
    </v-expand-transition>
    <div
      :ref="workerList.listRef"
      data-test="worker-list"
      :style="{
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
      }"
    >
      <div
        v-for="{ item: worker, key } in virtualItems"
        :key="key"
        :ref="element => workerList.measureElement(key, element)"
        class="worker-group-wrapper"
        :class="{ 'worker-group--highlighted': highlightedWorkerUid === key }"
      >
        <div class="worker-group-content pb-4">
          <v-expansion-panels
            :model-value="isWorkerExpanded(key) ? [key] : []"
            multiple
            static
            @update:model-value="openPanels => setWorkerExpanded(key, !!openPanels.length)"
          >
            <v-expansion-panel
              class="worker-group-panel"
              :value="key"
            >
              <v-expansion-panel-title
                :class="{ 'worker-group-title--error': workersValidation[key]?.$errors.length }"
                hide-actions
              >
                <v-icon
                  size="small"
                  class="mr-2 flex-grow-0 flex-shrink-0"
                >
                  {{ isWorkerExpanded(key) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                </v-icon>
                <span class="text-body-2 font-weight-medium">{{ worker.name }}</span>
                <v-tooltip
                  v-if="workersValidation[key]?.$errors.length"
                  location="top"
                  max-width="600"
                  :text="getWorkerValidationMessage(workersValidation[key])"
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      data-test="worker-validation-error"
                      class="ml-2"
                      color="error"
                      icon="mdi-alert-circle-outline"
                      size="small"
                    />
                  </template>
                </v-tooltip>
                <template v-if="!isWorkerExpanded(key)">
                  <template v-if="workerSummaries[key]?.machineLabel">
                    <span class="mx-2 text-medium-emphasis">/</span>
                    <span class="text-body-2 text-medium-emphasis">{{ workerSummaries[key].machineLabel }}</span>
                  </template>
                  <template v-if="workerSummaries[key]?.machineImageText">
                    <span class="mx-2 text-medium-emphasis">/</span>
                    <span class="d-inline-flex align-center">
                      <span class="text-body-2 text-medium-emphasis">{{ workerSummaries[key].machineImageText }}</span>
                      <template v-if="workerSummaries[key].isMachineImageDeprecated">
                        <span class="text-body-2 text-medium-emphasis ml-1">(</span><v-icon
                          size="x-small"
                          color="warning"
                          icon="mdi-alert-outline"
                        /><span class="text-body-2 text-medium-emphasis">deprecated)</span></template>
                    </span>
                  </template>
                  <template v-if="worker.zones?.length">
                    <span class="mx-2 text-medium-emphasis">/</span>
                    <v-chip
                      v-for="(zone, zoneIndex) in worker.zones.slice(0, 3)"
                      :key="`${zone}-${zoneIndex}`"
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
              </v-expansion-panel-title>
              <span
                v-if="isWorkerExpanded(key)"
                class="worker-actions"
              >
                <span
                  data-test="duplicate-worker-action"
                  class="d-inline-flex mr-2"
                  @click.stop
                >
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="tonal-info"
                    prepend-icon="mdi-content-copy"
                    :disabled="!allMachineTypes.length"
                    @click.stop="duplicateWorker(key)"
                  >
                    Duplicate
                  </v-btn>
                  <v-tooltip
                    activator="parent"
                    location="top"
                    text="No machine types are available in the selected cloud profile"
                    :disabled="!!allMachineTypes.length"
                  />
                </span>
                <span
                  v-if="providerWorkers.length > 1"
                  data-test="remove-worker-action"
                  class="d-inline-flex mr-2"
                  @click.stop
                >
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="tonal-error"
                    prepend-icon="mdi-delete-outline"
                    :disabled="isRemoveDisabled(key)"
                    @click.stop="removeWorker(key)"
                  >
                    Remove
                  </v-btn>
                  <v-tooltip
                    activator="parent"
                    location="top"
                    text="The last worker group cannot be removed"
                    :disabled="!isRemoveDisabled(key)"
                  />
                </span>
              </span>
              <v-expansion-panel-text>
                <g-worker-input-generic
                  :worker="worker"
                  :validation="workersValidation[key]"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </div>
    </div>
    <v-row class="my-0">
      <v-col>
        <span
          ref="addWorkerAction"
          data-test="add-worker-action"
          class="d-inline-flex"
        >
          <v-btn
            :disabled="!allMachineTypes.length"
            variant="text"
            color="primary"
            @click="addWorker"
          >
            <v-icon class="text-primary">
              mdi-plus
            </v-icon>
            Add Worker Group
          </v-btn>
          <v-tooltip
            activator="parent"
            location="top"
            text="No machine types are available in the selected cloud profile"
            :disabled="!!allMachineTypes.length"
          />
        </span>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onBeforeUnmount,
  useTemplateRef,
} from 'vue'

import GWorkerInputGeneric from '@/components/ShootWorkers/GWorkerInputGeneric'

import { useKeyedVirtualList } from '@/composables/useKeyedVirtualList'
import { useShootContext } from '@/composables/useShootContext'
import { useHeightTransitions } from '@/composables/useHeightTransitions'
import { useWorkersValidation } from '@/composables/useWorkersValidation'

import { messageFromErrors } from '@/utils/validators'

const props = defineProps({
  expandByDefault: {
    type: Boolean,
    default: false,
  },
})

const {
  providerWorkers,
  workerless,
  allMachineTypes,
  machineImages,
  addProviderWorker,
  duplicateProviderWorker,
  removeProviderWorker,
} = useShootContext()
const workersValidation = useWorkersValidation()

const workerSummaries = computed(() => {
  const summaries = {}
  for (const worker of providerWorkers.value) {
    const machineLabel = [worker.machine?.architecture, worker.machine?.type].filter(Boolean).join(' / ')
    const { name, version } = worker.machine?.image ?? {}
    const machineImageText = [name, version].filter(Boolean).join(' ') || undefined
    const machineImage = machineImages.value.find(image => image.name === name && image.version === version)
    summaries[worker._uid] = {
      machineLabel: machineLabel || undefined,
      machineImageText,
      isMachineImageDeprecated: machineImage?.isDeprecated ?? false,
    }
  }
  return summaries
})

// Estimates match measured worker cards at the editor's default width.
const estimatedCollapsedWorkerHeight = 68
const estimatedExpandedWorkerHeight = 512
const expandedWorkerUids = ref(new Set())
const pendingRemovalUid = ref()
const addWorkerAction = useTemplateRef('addWorkerAction')
const highlightedWorkerUid = ref()
const workerHighlightDuration = 3000
let workerHighlightTimer
let knownWorkerUids = new Set()

const workerList = useKeyedVirtualList({
  items: providerWorkers,
  getKey: worker => worker._uid,
  estimateSize: worker => isWorkerExpanded(worker._uid)
    ? estimatedExpandedWorkerHeight
    : estimatedCollapsedWorkerHeight,
})
const {
  virtualItems,
  paddingTop,
  paddingBottom,
} = workerList
const workerTransitions = useHeightTransitions({
  getElement: workerList.getElement,
  getScrollContainer: () => workerList.scrollContainer.value,
})

watch(providerWorkers, workers => {
  const workerUids = new Set(workers.map(worker => worker._uid))
  const nextExpandedWorkerUids = new Set(
    [...expandedWorkerUids.value].filter(uid => workerUids.has(uid)),
  )

  if (props.expandByDefault) {
    for (const uid of workerUids) {
      if (!knownWorkerUids.has(uid)) {
        nextExpandedWorkerUids.add(uid)
      }
    }
  }

  knownWorkerUids = workerUids
  expandedWorkerUids.value = nextExpandedWorkerUids
}, { immediate: true, flush: 'sync' })

const allCollapsed = computed(() =>
  providerWorkers.value.length > 0 &&
  expandedWorkerUids.value.size === 0,
)

const remainingWorkerCount = computed(() =>
  providerWorkers.value.length - (pendingRemovalUid.value ? 1 : 0),
)

function isWorkerExpanded (uid) {
  return expandedWorkerUids.value.has(uid)
}

function getWorkerValidationMessage (validation) {
  const localErrors = (validation?.$errors ?? []).map(error => {
    const fieldName = error.$params.fieldName
    const prefixEnd = fieldName?.startsWith('[Worker Group')
      ? fieldName.indexOf('] ')
      : -1
    return {
      ...error,
      $params: {
        ...error.$params,
        fieldName: prefixEnd >= 0 ? fieldName.slice(prefixEnd + 2) : fieldName,
      },
    }
  })
  return messageFromErrors(localErrors)
}

async function revealNewWorker (uid, { revealUntil } = {}) {
  if (!uid) {
    return
  }

  setWorkerExpanded(uid, true)
  highlightWorker(uid)
  workerList.pin(uid)

  try {
    await nextTick()
    if (!workerList.getElement(uid)) {
      workerList.scrollToKey(uid)
    }
    await workerTransitions.enter(uid, { revealUntil })
  } finally {
    workerList.unpin(uid)
  }
}

function highlightWorker (uid) {
  highlightedWorkerUid.value = uid
  clearTimeout(workerHighlightTimer)
  workerHighlightTimer = setTimeout(() => {
    if (highlightedWorkerUid.value === uid) {
      highlightedWorkerUid.value = undefined
    }
  }, workerHighlightDuration)
}

function addWorker () {
  workerTransitions.finishActive()
  addProviderWorker()
  revealNewWorker(providerWorkers.value.at(-1)?._uid, {
    revealUntil: addWorkerAction.value,
  })
}

function duplicateWorker (uid) {
  workerTransitions.finishActive()
  const index = findWorkerIndex(uid)
  if (index < 0) {
    return
  }
  duplicateProviderWorker(index)
  revealNewWorker(providerWorkers.value[index + 1]?._uid)
}

function findWorkerIndex (uid) {
  return providerWorkers.value.findIndex(worker => worker._uid === uid)
}

function completeWorkerRemoval (uid) {
  if (pendingRemovalUid.value !== uid) {
    return
  }

  pendingRemovalUid.value = undefined
  const index = findWorkerIndex(uid)
  if (index >= 0) {
    removeProviderWorker(index)
  }
  workerList.unpin(uid)
}

function removeWorker (uid) {
  workerTransitions.finishActive()
  if (remainingWorkerCount.value <= 1) {
    return
  }

  pendingRemovalUid.value = uid
  workerList.pin(uid)
  workerTransitions.leave(uid, {
    onComplete: () => completeWorkerRemoval(uid),
  })
}

function isRemoveDisabled (uid) {
  return remainingWorkerCount.value <= 1 || pendingRemovalUid.value === uid
}

function setWorkerExpanded (uid, isExpanded) {
  const nextExpandedWorkerUids = new Set(expandedWorkerUids.value)
  if (isExpanded) {
    nextExpandedWorkerUids.add(uid)
  } else {
    nextExpandedWorkerUids.delete(uid)
  }
  expandedWorkerUids.value = nextExpandedWorkerUids
}

function toggleCollapseAll () {
  if (allCollapsed.value) {
    expandedWorkerUids.value = new Set(
      providerWorkers.value.map(worker => worker._uid),
    )
  } else {
    expandedWorkerUids.value = new Set()
  }
  workerList.resetMeasurements()
}

onBeforeUnmount(() => {
  clearTimeout(workerHighlightTimer)
})

</script>

<style scoped>
.worker-group-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  transition: background-color 0.5s ease;
}

.worker-group-panel > :deep(.v-expansion-panel-title) {
  grid-column: 1;
  justify-content: flex-start;
  min-width: 0;
  width: auto;
}

.worker-group-panel > :deep(.v-expansion-panel-text) {
  grid-column: 1 / -1;
}

.worker-group--highlighted .worker-group-panel {
  background-color: rgb(var(--v-theme-accent));
}

.worker-group-title--error {
  background-color: rgba(var(--v-theme-error), 0.12);
}

.worker-actions {
  align-items: center;
  align-self: center;
  display: flex;
  grid-column: 2;
  grid-row: 1;
  padding-inline-start: 8px;
  position: relative;
  z-index: 1;
}

</style>
