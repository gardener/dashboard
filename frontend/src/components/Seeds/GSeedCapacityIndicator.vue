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
        :model-value="capacityUsagePercent"
        color="primary"
        :height="8"
        rounded
      />
    </div>
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
        <v-list class="tooltip-list">
          <v-list-item>
            <template #prepend>
              <v-icon
                color="primary"
                icon="mdi-vector-link"
                class="mr-3"
              />
            </template>
            <v-list-item-subtitle>Assigned</v-list-item-subtitle>
            <v-list-item-title>{{ props.shootCount }}</v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon
                color="primary"
                :icon="hasKnownCapacity ? 'mdi-chart-box-outline' : 'mdi-information-outline'"
                class="mr-3"
              />
            </template>
            <v-list-item-subtitle>
              <template v-if="hasKnownCapacity">
                Allocatable — Total allocatable shoots for this seed
              </template>
              <template v-else>
                Allocatable — This seed does not report allocatable shoot capacity
              </template>
            </v-list-item-subtitle>
            <v-list-item-title>
              <template v-if="hasKnownCapacity">
                {{ props.allocatableShoots }}
              </template>
              <span
                v-else
                class="text-medium-emphasis"
              >Unknown</span>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-tooltip>
  </div>
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
