<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="activator d-inline-flex align-center justify-center"
    :style="{ minWidth: `${donut.size}px`, minHeight: `${donut.size}px` }"
    tabindex="0"
    role="img"
    :aria-label="ariaLabel"
  >
    <span
      v-if="shootCount === 0"
      class="text-medium-emphasis"
      aria-hidden="true"
    >-</span>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      :width="donut.size"
      :height="donut.size"
      :viewBox="donut.viewBox"
      aria-hidden="true"
    >
      <g :transform="donut.rotateTransform">
        <circle
          v-for="seg in donutVisibleSegments"
          :key="seg.key"
          :class="['segment', seg.key]"
          :cx="donut.center"
          :cy="donut.center"
          :r="donut.radius"
          fill="none"
          :stroke-width="donut.strokeWidth"
          :stroke-dasharray="seg.dasharray"
          :stroke-dashoffset="seg.dashoffset"
        />
        <circle
          v-for="seg in overlayVisibleSegments"
          :key="seg.key"
          :class="['segment', seg.key]"
          :cx="donut.center"
          :cy="donut.center"
          :r="donut.radius"
          fill="none"
          :stroke-width="donut.strokeWidth"
          :stroke-dasharray="seg.dasharray"
          :stroke-dashoffset="seg.dashoffset"
        />
      </g>
      <text
        :class="['center-text', centerTextSizeClass, { error: matchingUnhealthy > 0 }]"
        :x="donut.center"
        :y="donut.center"
        text-anchor="middle"
        dominant-baseline="central"
        aria-hidden="true"
      >{{ centerText }}</text>
    </svg>
    <g-detail-tooltip
      activator="parent"
      title="Shoot health"
    >
      <div
        v-if="shootCount === 0"
        class="d-flex align-center text-medium-emphasis"
      >
        <v-icon
          class="mr-2"
          icon="mdi-information-outline"
          size="small"
        />
        <span>No shoots assigned</span>
      </div>
      <template v-else>
        <div class="health-row">
          <v-icon
            color="error"
            icon="mdi-alert-circle-outline"
            size="small"
          />
          <span>{{ hasActiveFilters ? 'Unhealthy shown' : 'Unhealthy' }}</span>
          <strong>{{ matchingUnhealthy }}</strong>
        </div>
        <div
          v-if="hasActiveFilters"
          class="health-row"
        >
          <v-icon
            color="warning"
            icon="mdi-filter-minus-outline"
            size="small"
          />
          <span>Unhealthy filtered out</span>
          <strong>{{ hiddenUnhealthy }}</strong>
        </div>
        <div class="health-row">
          <v-icon
            color="success"
            icon="mdi-check-circle-outline"
            size="small"
          />
          <span>Healthy</span>
          <strong>{{ healthyShoots }}</strong>
        </div>
      </template>
      <template
        v-if="hasActiveFilters"
        #footer
      >
        <div class="filter-summary">
          <span>Cluster Operations excludes</span>
          <span>{{ filterDescription }}</span>
        </div>
      </template>
    </g-detail-tooltip>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

import GDetailTooltip from '@/components/GDetailTooltip.vue'

import { useDonutChart } from '@/composables/useDonutChart'

const props = defineProps({
  shootCount: {
    type: Number,
    default: 0,
    validator: v => Number.isInteger(v) && v >= 0,
  },
  totalUnhealthyShoots: {
    type: Number,
    default: 0,
    validator: v => Number.isInteger(v) && v >= 0,
  },
  // Unhealthy shoots that pass the active filter mask (≤ totalUnhealthyShoots)
  matchingUnhealthyShoots: {
    type: Number,
    default: 0,
    validator: v => Number.isInteger(v) && v >= 0,
  },
  activeFilterLabels: {
    type: Array,
    default: () => [],
  },
})

const {
  shootCount,
  totalUnhealthyShoots: totalUnhealthy,
  matchingUnhealthyShoots: matchingUnhealthy,
  activeFilterLabels,
} = toRefs(props)

const hiddenUnhealthy = computed(() => totalUnhealthy.value - matchingUnhealthy.value)
const healthyShoots = computed(() => shootCount.value - totalUnhealthy.value)
const hasActiveFilters = computed(() => activeFilterLabels.value.length > 0)


const filterDescription = computed(() => {
  const labels = activeFilterLabels.value
  if (!labels.length) {
    return undefined
  }
  const shown = labels.slice(0, 2).join(', ')
  const remaining = labels.length - 2
  const suffix = remaining > 0 ? ` & ${remaining} more` : ''
  return `${shown}${suffix}`
})

// --- donut chart (two layers sharing the same total) ---

const donutOptions = { total: shootCount }

const baseSegments = computed(() => {
  if (shootCount.value === 0) {
    return []
  }
  return [
    { key: 'unhealthy', value: totalUnhealthy.value },
    { key: 'healthy', value: healthyShoots.value },
  ]
})

const overlaySegments = computed(() => {
  if (shootCount.value === 0 || matchingUnhealthy.value === 0) {
    return []
  }
  return [
    { key: 'matching', value: matchingUnhealthy.value },
  ]
})

const {
  visibleSegments: donutVisibleSegments,
  ...donut
} = useDonutChart(baseSegments, donutOptions)

const {
  visibleSegments: overlayVisibleSegments,
} = useDonutChart(overlaySegments, donutOptions)

// --- center text ---

function formatCompact (value) {
  if (value < 1000) {
    return String(value)
  }
  if (value < 10000) {
    const v = Math.floor(value / 100) / 10
    return `${v.toFixed(v < 10 ? 1 : 0)}k`
  }
  return `${Math.floor(value / 1000)}k`
}

const centerText = computed(() => formatCompact(matchingUnhealthy.value))

const centerTextSizeClass = computed(() => {
  if (matchingUnhealthy.value >= 1000) {
    return 'compact'
  }
  if (matchingUnhealthy.value >= 100) {
    return 'small'
  }
  return ''
})

// --- accessibility ---

function formatShootCount (count, qualifier) {
  const noun = count === 1 ? 'shoot' : 'shoots'
  return [count, qualifier, noun].filter(value => value !== undefined).join(' ')
}

const ariaLabel = computed(() => {
  if (shootCount.value === 0) {
    return 'No shoots assigned to this seed.'
  }
  const parts = [
    'Shoot health distribution',
    formatShootCount(shootCount.value),
    formatShootCount(matchingUnhealthy.value, 'unhealthy'),
  ]
  if (activeFilterLabels.value.length > 0) {
    const desc = filterDescription.value
      ? ` (${filterDescription.value})`
      : ''
    parts.push(`${formatShootCount(hiddenUnhealthy.value, 'unhealthy')} excluded by Cluster Operations filters${desc}`)
  }
  parts.push(formatShootCount(healthyShoots.value, 'healthy'))
  return parts.join(', ') + '.'
})
</script>

<style lang="scss" scoped>
  .activator {
    color: inherit;
    text-decoration: none;
  }

  .health-row {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 20px minmax(0, 1fr) auto;

    strong {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
  }

  .filter-summary {
    display: grid;
    gap: 2px;
  }

  .center-text {
    fill: rgba(var(--v-theme-on-surface), 0.72);
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
    pointer-events: none;

    &.small {
      font-size: 12px;
    }

    &.compact {
      font-size: 10px;
    }

    &.error {
      fill: rgba(var(--v-theme-on-surface), 0.92);
      font-weight: 500;
    }
  }

  .segment {
    stroke-linecap: butt;

    &.matching {
      stroke: rgb(var(--v-theme-error));
      pointer-events: none;
    }

    &.unhealthy {
      stroke: rgb(var(--v-theme-error-lighten-3));
    }

    &.healthy {
      stroke: rgb(var(--v-theme-success));
    }
  }
</style>
