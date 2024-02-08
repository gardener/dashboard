<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-wrap align-center">
    <template v-if="collapse && !expanded">
      <v-tooltip
        :class="{ 'worker-chips-tooltip' : hasShootWorkerGroups }"
        location="top"
        max-width="400px"
      >
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            color="primary"
            variant="tonal"
            @click="expanded = true"
          >
            {{ shootWorkerGroups.length }}
            {{ shootWorkerGroups.length !== 0 ? 'Groups' : 'Group' }}
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
    <template v-else>
      <v-tooltip
        v-if="!hasShootWorkerGroups"
        location="top"
      >
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            size="small"
            variant="tonal"
            color="disabled"
          >
            workerless
          </v-chip>
        </template>
        This cluster does not have worker groups
      </v-tooltip>
      <div
        v-for="(workerGroup, i) in shootWorkerGroups"
        :key="workerGroup.name"
        class="d-flex flex-nowrap align-center"
      >
        <g-worker-group
          v-model="workerGroupTab"
          :worker-group="workerGroup"
          :cloud-profile-name="shootCloudProfileName"
          :shoot-metadata="shootMetadata"
          class="ma-1"
        />
        <v-btn
          v-if="collapse && i === shootWorkerGroups.length-1"
          icon="mdi-chevron-left"
          size="small"
          density="compact"
          variant="flat"
          @click="expanded = !expanded"
        />
      </div>
    </template>
  </div>
</template>

<script>
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GWorkerChip from '@/components/ShootWorkers/GWorkerChip'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GWorkerGroup,
    GWorkerChip,
  },
  mixins: [shootItem],
  props: {
    collapse: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      workerGroupTab: 'overview',
      expanded: false,
    }
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
