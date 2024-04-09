<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="ml-3">
    <div class="text-subtitle-1 pt-4">
      {{ title }}
    </div>
    <div
      v-if="!hideOsUpdates && (selectable || osUpdates)"
      class="d-flex mt-4"
    >
      <div class="d-flex align-center justify-center action-select">
        <v-checkbox
          v-if="selectable"
          v-model="osUpdates"
          hide-details
          color="primary"
          density="compact"
          class="pl-2"
        />
        <v-icon v-else>
          mdi-arrow-up-bold-circle-outline
        </v-icon>
      </div>
      <div class="d-flex flex-column">
        <div class="wrap-text text-subtitle-2">
          Operating System
        </div>
        <div class="wrap-text pt-1 text-body-2">
          Update the operating system of the workers<br>
          (requires rolling update of all workers, ensure proper pod disruption budgets to ensure availability of your workload)
        </div>
      </div>
    </div>
    <div
      v-if="selectable || k8sUpdates"
      class="d-flex mt-4"
    >
      <div class="d-flex align-center justify-center action-select">
        <v-checkbox
          v-if="selectable"
          v-model="k8sUpdates"
          hide-details
          color="primary"
          density="compact"
          class="pl-2"
        />
        <v-icon v-else>
          mdi-arrow-up-bold-circle-outline
        </v-icon>
      </div>
      <div class="d-flex flex-column">
        <div class="wrap-text text-subtitle-2">
          Kubernetes Patch Version
        </div>
        <div class="wrap-text pt-1 text-body-2">
          Update the control plane of the cluster and the worker components<br>
          (control plane, most notably the API server, will be briefly unavailable during switch-over)
        </div>
      </div>
    </div>
    <div
      v-if="selectable"
      class="d-flex mt-4"
    >
      <div class="d-flex align-center justify-center action-select">
        <v-icon>mdi-information-outline</v-icon>
      </div>
      <div class="d-flex align-center justify-center wrap-text text-subtitle-2">
        Automatic updates will not update to preview versions
      </div>
    </div>
    <div
      v-if="showNoUpdates"
      class="d-flex mt-4"
    >
      <div class="d-flex align-center justify-center action-select">
        <v-icon>mdi-close-circle-outline</v-icon>
      </div>
      <div class="d-flex flex-column">
        <div class="wrap-text text-subtitle-2">
          Updates disabled
        </div>
        <div class="wrap-text pt-1 text-body-2">
          All automatic updates have been disabled for this cluster
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useShootContextStore } from '@/store/shootContext'

const props = defineProps({
  title: {
    type: String,
    default: 'Auto Update',
  },
  selectable: {
    type: Boolean,
    default: true,
  },
  hideOsUpdates: {
    type: Boolean,
    default: false,
  },
})
const { title, selectable, hideOsUpdates } = toRefs(props)

const shootContextStore = useShootContextStore()
const {
  k8sUpdates,
  osUpdates,
} = storeToRefs(shootContextStore)

const showNoUpdates = computed(() => {
  return selectable.value && !osUpdates.value && !k8sUpdates.value
})
</script>

<style lang="scss" scoped>
.action-select {
  min-width: 48px;
}
</style>
