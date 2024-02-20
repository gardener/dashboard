<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="collapse && !expanded">
    <v-tooltip
      :class="{ 'worker-chips-tooltip' : hasShootWorkerGroups }"
      location="top"
      max-width="400px"
      open-delay="200"
    >
      <template #activator="{ props }">
        <g-auto-hide
          right
          class="w-100"
        >
          <template #activator>
            <v-chip
              v-bind="props"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ shootWorkerGroups.length }}
              {{ shootWorkerGroups.length !== 1 ? 'Groups' : 'Group' }}
            </v-chip>
          </template>
          <v-btn
            icon="mdi-chevron-right"
            size="small"
            density="compact"
            variant="flat"
            @click="toggleExpanded"
          />
        </g-auto-hide>
      </template>
      <span v-if="!hasShootWorkerGroups">This cluster does not have worker groups</span>
      <v-card
        v-else
        class="pa-1"
      >
        <g-worker-chip
          v-for="(workerGroup) in shootWorkerGroups"
          :key="workerGroup.name"
          :worker-group="workerGroup"
          :cloud-profile-name="shootCloudProfileName"
          class="ma-1"
        />
      </v-card>
    </v-tooltip>
  </template>
  <template v-else>
    <v-hover v-slot="{ isHovering, props }">
      <div
        class="d-flex align-center"
        v-bind="props"
      >
        <v-tooltip
          v-if="!hasShootWorkerGroups"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <v-chip
              v-bind="tooltipProps"
              size="small"
              variant="tonal"
              color="disabled"
            >
              workerless
            </v-chip>
            <v-btn
              v-visible="isHovering"
              icon="mdi-chevron-left"
              size="small"
              density="compact"
              variant="flat"
              @click="toggleExpanded"
            />
          </template>
          This cluster does not have worker groups
        </v-tooltip>
        <div
          v-else
          class="d-flex flex-wrap"
        >
          <div
            v-for="(workerGroup, i) in shootWorkerGroups"
            :key="workerGroup.name"
            class="d-flex align-center"
          >
            <g-worker-group
              v-model="workerGroupTab"
              :worker-group="workerGroup"
              :cloud-profile-name="shootCloudProfileName"
              :shoot-metadata="shootMetadata"
              class="ma-1"
            />
            <v-btn
              v-if="collapse && i === shootWorkerGroups.length - 1"
              v-visible="isHovering"
              icon="mdi-chevron-left"
              size="small"
              density="compact"
              variant="flat"
              @click="toggleExpanded"
            />
          </div>
        </div>
      </div>
    </v-hover>
  </template>
</template>

<script>
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GWorkerChip from '@/components/ShootWorkers/GWorkerChip'
import GAutoHide from '@/components/GAutoHide'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GWorkerGroup,
    GWorkerChip,
    GAutoHide,
  },
  mixins: [shootItem],
  inject: {
    expandedWorkerGroups: {
      default: undefined,
    },
  },
  props: {
    collapse: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      workerGroupTab: 'overview',
      internalExpanded: false,
    }
  },
  computed: {
    expanded: {
      get () {
        if (this.expandedWorkerGroups) {
          return this.expandedWorkerGroups[this.shootMetadata.uid] ?? this.expandedWorkerGroups.default
        }
        return this.internalExpanded
      },
      set (value) {
        if (this.expandedWorkerGroups) {
          this.expandedWorkerGroups[this.shootMetadata.uid] = value
        } else {
          this.internalExpanded = value
        }
      },
    },
  },
  methods: {
    toggleExpanded (e) {
      const newValue = !this.expanded

      if (e.shiftKey) {
        if (this.expandedWorkerGroups) {
          for (const key in this.expandedWorkerGroups) {
            delete this.expandedWorkerGroups[key]
          }
          this.expandedWorkerGroups.default = newValue
        }
      } else {
        this.expanded = newValue
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.worker-chips-tooltip {
  :deep(.v-overlay__content) {
    opacity: 1 !important;
    padding: 0;
  }
}

</style>
