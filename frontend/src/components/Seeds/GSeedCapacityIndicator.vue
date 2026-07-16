<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="activator"
    tabindex="0"
    :aria-label="ariaLabel"
  >
    <div class="capacity-indicator">
      <span class="text">{{ capacityText }}</span>
      <v-progress-linear
        v-if="hasCapacityProgress"
        class="progress"
        :model-value="capacityProgressPercent"
        color="primary"
        :height="8"
        rounded
      />
    </div>
    <g-detail-tooltip
      activator="parent"
      title="Seed capacity"
    >
      <div class="metric-row">
        <v-icon
          :color="primaryColor"
          icon="mdi-vector-link"
          size="small"
        />
        <span>Assigned shoots</span>
        <strong>{{ props.shootCount }}</strong>
      </div>
      <div class="metric-row">
        <v-icon
          :color="hasKnownCapacity ? primaryColor : undefined"
          :class="{ 'text-medium-emphasis': !hasKnownCapacity }"
          :icon="hasKnownCapacity ? 'mdi-chart-box-outline' : 'mdi-information-outline'"
          size="small"
        />
        <span>Allocatable shoots</span>
        <strong :class="{ 'text-medium-emphasis': !hasKnownCapacity }">
          {{ hasKnownCapacity ? props.allocatableShoots : 'Unknown' }}
        </strong>
      </div>
      <template v-if="hasCapacityProgress">
        <v-progress-linear
          :model-value="capacityProgressPercent"
          color="primary"
          :height="6"
          rounded
        />
        <div class="capacity-summary text-medium-emphasis">
          <span>{{ capacityUsageLabel }} used</span>
          <span>{{ remainingCapacity }} remaining</span>
        </div>
      </template>
      <template
        v-if="!hasKnownCapacity"
        #footer
      >
        This seed does not report its allocatable shoot capacity.
      </template>
    </g-detail-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

import GDetailTooltip from '@/components/GDetailTooltip.vue'

const props = defineProps({
  allocatableShoots: {
    type: Number,
  },
  shootCount: {
    type: Number,
    default: 0,
  },
})

const hasKnownCapacity = computed(() => {
  return Number.isFinite(props.allocatableShoots)
})

const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const primaryColor = computed(() => isDark.value ? 'primary-lighten-2' : 'primary')

const hasCapacityProgress = computed(() => {
  return hasKnownCapacity.value && props.allocatableShoots > 0
})

const capacityUsagePercent = computed(() => {
  if (!hasCapacityProgress.value) {
    return 0
  }

  return props.shootCount / props.allocatableShoots * 100
})

const capacityProgressPercent = computed(() => {
  return Math.min(capacityUsagePercent.value, 100)
})

const capacityText = computed(() => {
  if (!hasKnownCapacity.value) {
    return `${props.shootCount}`
  }

  return `${props.shootCount} / ${props.allocatableShoots}`
})

const capacityUsageLabel = computed(() => {
  return `${Math.round(capacityUsagePercent.value)}%`
})

const remainingCapacity = computed(() => {
  if (!hasKnownCapacity.value) {
    return undefined
  }
  return Math.max(props.allocatableShoots - props.shootCount, 0)
})

const ariaLabel = computed(() => {
  if (!hasKnownCapacity.value) {
    return `Seed capacity: ${props.shootCount} assigned shoots, allocatable capacity unknown`
  }
  const percent = Math.round(capacityUsagePercent.value)
  return `Seed capacity: ${props.shootCount} of ${props.allocatableShoots} allocatable shoots assigned (${percent}%)`
})
</script>

<style lang="scss" scoped>
  .activator {
    color: inherit;
    display: inline-grid;
    text-decoration: none;
  }

  .capacity-indicator {
    display: inline-grid;
    gap: 0.25rem;
    min-width: 88px;
  }

  .metric-row {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 20px minmax(0, 1fr) auto;

    strong {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
  }

  .capacity-summary {
    display: flex;
    font-size: 0.75rem;
    justify-content: space-between;
  }

  .text {
    white-space: nowrap;
  }

  .progress {
    min-width: 88px;
  }
</style>
