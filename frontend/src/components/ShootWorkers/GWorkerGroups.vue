<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!isShootWorkerless"
    class="d-flex align-center"
  >
    <g-worker-group
      v-for="workerGroup in shootWorkerGroups"
      :key="workerGroup.name"
      v-model="workerGroupTab"
      :worker-group="workerGroup"
      :cloud-profile-name="shootCloudProfileName"
      :shoot-item="shootItem"
      class="ma-1"
    />
  </div>
  <span v-else>
    Workerless Cluster
  </span>
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
