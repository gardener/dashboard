<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex align-center">
    <g-not-ready-project-warning
      v-if="!isReady"
      :project="project"
      :size="size"
    />
    <v-icon
      v-else
      v-tooltip:top="statusText"
      color="success"
      class="status-icon-check"
    >
      mdi-check-circle-outline
    </v-icon>
    <span
      v-if="showStatusText"
      class="ml-2"
    >{{ statusText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

import GNotReadyProjectWarning from '@/components/GNotReadyProjectWarning.vue'

import get from 'lodash/get'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  size: {
    type: String,
    default: 'default',
  },
  showStatusText: {
    type: Boolean,
    default: false,
  },
})

const projectPhase = computed(() => get(props.project, ['status', 'phase']))
const inDeletion = computed(() => !!get(props.project, ['metadata', 'deletionTimestamp']))
const isReady = computed(() => projectPhase.value === 'Ready' && !inDeletion.value)
const statusText = computed(() => inDeletion.value ? 'Deleting' : projectPhase.value || 'Unknown')
</script>

<style lang="scss" scoped>
.status-icon-check {
  font-size: 30px !important;
}
</style>
