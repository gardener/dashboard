<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-inline-flex align-center justify-center"
    :style="{ minWidth: `${donut.size}px`, minHeight: `${donut.size}px` }"
    tabindex="0"
    role="img"
    :aria-label="ariaLabel"
  >
    <span
      v-if="shootCount === 0"
      class="empty text-medium-emphasis"
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
    <v-tooltip
      activator="parent"
      location="top"
      :open-delay="200"
      content-class="pa-0"
      :content-props="{ style: { background: 'transparent' } }"
    >
      <v-card
        class="tooltip-card"
        elevation="12"
      >
        <g-list class="tooltip-list">
          <template v-if="shootCount === 0">
            <g-list-item>
              <template #prepend>
                <v-icon
                  icon="mdi-information-outline"
                  size="28"
                  class="text-medium-emphasis"
                />
              </template>
              <g-list-item-content label="No shoots assigned" />
            </g-list-item>
          </template>
          <template v-else>
            <g-list-item>
              <template #prepend>
                <v-icon
                  color="error"
                  icon="mdi-alert-circle-outline"
                  size="28"
                />
              </template>
              <g-list-item-content label="Unhealthy">
                {{ matchingUnhealthy }}
              </g-list-item-content>
            </g-list-item>
            <template v-if="hiddenUnhealthy > 0">
              <v-divider inset />
              <g-list-item>
                <template #prepend>
                  <v-icon
                    icon="mdi-filter-outline"
                    size="28"
                    class="text-error-lighten-3"
                  />
                </template>
                <g-list-item-content
                  label="Excluded"
                  :description="filterDescription"
                >
                  {{ hiddenUnhealthy }}
                </g-list-item-content>
              </g-list-item>
            </template>
            <v-divider inset />
            <g-list-item>
              <template #prepend>
                <v-icon
                  color="success"
                  icon="mdi-check-circle-outline"
                  size="28"
                />
              </template>
              <g-list-item-content label="Healthy">
                {{ healthyShoots }}
              </g-list-item-content>
            </g-list-item>
          </template>
        </g-list>
      </v-card>
    </v-tooltip>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

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

const filterDescription = computed(() => {
  if (hiddenUnhealthy.value === 0) {
    return undefined
  }
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

const ariaLabel = computed(() => {
  if (shootCount.value === 0) {
    return 'No shoots assigned to this seed.'
  }
  const parts = [
    'Shoot health distribution',
    `${shootCount.value} shoots`,
    `${matchingUnhealthy.value} unhealthy shoots`,
  ]
  if (hiddenUnhealthy.value > 0) {
    const desc = filterDescription.value
      ? ` (${filterDescription.value})`
      : ''
    parts.push(`${hiddenUnhealthy.value} excluded by filter${desc}`)
  }
  parts.push(`${healthyShoots.value} healthy shoots`)
  return parts.join(', ') + '.'
})
</script>

<style lang="scss" scoped>
  .empty {
    font-size: 0.875rem;
  }

  .tooltip-card,
  .tooltip-list {
    background-color: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
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
      fill: rgb(var(--v-theme-error));
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
