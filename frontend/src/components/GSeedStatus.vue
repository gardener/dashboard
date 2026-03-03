<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex align-center">
    <g-popover
      v-model="internalValue"
      :toolbar-title="toolbarTitle"
      :toolbar-color="color"
      :placement="popperPlacement"
    >
      <template #activator="{ props: activatorProps }">
        <div class="d-flex align-center">
          <v-tooltip
            location="top"
            :disabled="internalValue"
          >
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="mergeProps(activatorProps, tooltipProps)"
                density="comfortable"
                variant="text"
                icon
              >
                <v-progress-circular
                  v-if="showProgress"
                  :size="27"
                  :width="3"
                  :model-value="seedLastOperation.progress"
                  :color="color"
                >
                  <v-icon
                    v-if="hasStatusIcon"
                    size="small"
                    :color="color"
                    :icon="statusIcon"
                  />
                  <span
                    v-else
                    class="text-body-small"
                  >
                    {{ seedLastOperation.progress }}
                  </span>
                </v-progress-circular>
                <template v-else>
                  <v-icon
                    v-if="hasStatusIcon"
                    size="small"
                    :color="color"
                    :icon="statusIcon"
                  />
                  <v-progress-circular
                    v-else-if="isPending"
                    :size="27"
                    :width="3"
                    indeterminate
                    :color="color"
                  />
                  <v-icon
                    v-else
                    color="success"
                    class="status-icon-check"
                  >
                    mdi-check-circle-outline
                  </v-icon>
                </template>
              </v-btn>
            </template>
            <div>
              <span class="font-weight-bold">{{ tooltip.title }}</span>
              <span
                v-if="tooltip.progress"
                class="ml-1"
              >({{ tooltip.progress }}%)</span>
            </div>
          </v-tooltip>
        </div>
      </template>
      <g-shoot-message-details
        :status-title="statusTitle"
        :last-message="lastMessage"
        :last-update-time="seedLastOperation.lastUpdateTime"
      />
    </g-popover>
    <span
      v-if="showStatusText"
      class="ml-2"
    >{{ statusTitle }}</span>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
} from 'vue'

import GShootMessageDetails from '@/components/GShootMessageDetails.vue'

import { useOperationStatus } from '@/composables/useOperationStatus'
import { useSeedItem } from '@/composables/useSeedItem'

defineProps({
  popperPlacement: {
    type: String,
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
})

const mergeProps = inject('mergeProps')
const activePopoverKey = inject('activePopoverKey')

const {
  seedLastOperation,
  seedMetadata,
} = useSeedItem()

const hasErrors = computed(() => false)

const {
  operationType,
  operationState,
  showProgress,
  isPending,
  baseStatusIcon: statusIcon,
  baseColor: color,
  defaultLastMessage: lastMessage,
} = useOperationStatus(seedLastOperation, hasErrors)

const popoverKey = computed(() => {
  return `g-seed-status:${seedMetadata.value.uid}`
})

const internalValue = computed({
  get () {
    return activePopoverKey.value === popoverKey.value
  },
  set (value) {
    activePopoverKey.value = value ? popoverKey.value : ''
  },
})

const hasStatusIcon = computed(() => {
  return !!statusIcon.value
})

const statusTitle = computed(() => {
  return `${operationType.value} ${operationState.value}`
})

const toolbarTitle = computed(() => {
  return statusTitle.value
})

const tooltip = computed(() => {
  return {
    title: statusTitle.value,
    progress: showProgress.value ? seedLastOperation.value.progress : undefined,
  }
})

</script>

<style lang="scss" scoped>
  .status-icon-check {
    font-size: 30px !important;
  }
</style>
