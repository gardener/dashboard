<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :open-delay="200"
    content-class="pa-0"
    :content-props="{ style: { background: 'transparent' } }"
  >
    <template #activator="{ props: tooltipProps }">
      <div
        v-bind="tooltipProps"
        class="activator"
        tabindex="0"
        :aria-label="ariaLabel"
      >
        <div class="capacity-indicator">
          <span class="text">{{ capacityText }}</span>
          <v-progress-linear
            v-if="hasCapacityProgress"
            class="progress"
            :model-value="capacityUsagePercent"
            color="primary"
            :height="8"
            rounded
          />
        </div>
      </div>
    </template>
    <v-card
      class="tooltip-card"
      elevation="12"
    >
      <g-list class="tooltip-list">
        <g-list-item>
          <template #prepend>
            <v-icon
              color="primary"
              icon="mdi-vector-link"
              size="28"
            />
          </template>
          <g-list-item-content label="Assigned">
            {{ props.shootCount }}
          </g-list-item-content>
        </g-list-item>
        <template v-if="hasKnownCapacity">
          <v-divider inset />
          <g-list-item>
            <template #prepend>
              <v-icon
                color="primary"
                icon="mdi-chart-box-outline"
                size="28"
              />
            </template>
            <g-list-item-content
              label="Allocatable"
              description="Total allocatable shoots for this seed"
            >
              {{ props.allocatableShoots }}
            </g-list-item-content>
          </g-list-item>
        </template>
        <template v-else>
          <v-divider inset />
          <g-list-item>
            <template #prepend>
              <v-icon
                color="primary"
                icon="mdi-information-outline"
                size="28"
              />
            </template>
            <g-list-item-content
              label="Allocatable"
              description="This seed does not report allocatable shoot capacity"
            >
              <span class="text-medium-emphasis">Unknown</span>
            </g-list-item-content>
          </g-list-item>
        </template>
      </g-list>
    </v-card>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'

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

const hasCapacityProgress = computed(() => {
  return hasKnownCapacity.value && props.allocatableShoots > 0
})

const capacityUsagePercent = computed(() => {
  if (!hasCapacityProgress.value) {
    return 0
  }

  return Math.min(props.shootCount / props.allocatableShoots * 100, 100)
})

const capacityText = computed(() => {
  if (!hasKnownCapacity.value) {
    return `${props.shootCount}`
  }

  return `${props.shootCount} / ${props.allocatableShoots}`
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
    display: inline-grid;
  }

  .capacity-indicator {
    display: inline-grid;
    gap: 0.25rem;
    min-width: 88px;
  }

  .tooltip-card,
  .tooltip-list {
    background-color: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
  }

  .text {
    white-space: nowrap;
  }

  .progress {
    min-width: 88px;
  }
</style>
