<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="hasShootWorkerGroups"
    class="d-flex align-center"
  >
    <g-worker-group
      v-for="workerGroup in shootWorkerGroups"
      :key="workerGroup.name"
      v-model="workerGroupTab"
      :worker-group="workerGroup"
      :cloud-profile-name="shootCloudProfileName"
      :shoot-metadata="shootMetadata"
    />
  </div>
  <v-tooltip
    v-else
    location="top"
  >
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        size="small"
        class="ma-1"
        variant="tonal"
        color="disabled"
      >
        workerless
      </v-chip>
    </template>
    This cluster does not have worker groups
  </v-tooltip>
</template>

<script>
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GWorkerGroup,
  },
  mixins: [shootItem],
  data () {
    return {
      workerGroupTab: 'overview',
    }
  },
}
</script>
