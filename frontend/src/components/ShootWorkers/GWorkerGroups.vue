<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="shootWorkerGroups"
    :uid="shootMetadata.uid"
    inject-key="expandedWorkerGroups"
    :collapse="collapse"
  >
    <template #collapsed="{ itemCount }">
      <v-tooltip
        :class="{ 'worker-chips-tooltip' : hasShootWorkerGroups }"
        location="top"
        max-width="400px"
        open-delay="200"
      >
        <template #activator="{ props: tooltipProps }">
          <v-chip
            v-bind="tooltipProps"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ itemCount }}
            {{ itemCount !== 1 ? 'Groups' : 'Group' }}
          </v-chip>
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
    <template #noItems>
      <v-tooltip
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
        </template>
        This cluster does not have worker groups
      </v-tooltip>
    </template>
    <template #item="{ item }">
      <g-worker-group
        v-model="workerGroupTab"
        :worker-group="item"
        :cloud-profile-name="shootCloudProfileName"
        :shoot-metadata="shootMetadata"
        class="ma-1"
      />
    </template>
  </g-collapsable-items>
</template>

<script>
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GWorkerChip from '@/components/ShootWorkers/GWorkerChip'
import GCollapsableItems from '@/components/GCollapsableItems'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GWorkerGroup,
    GWorkerChip,
    GCollapsableItems,
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
