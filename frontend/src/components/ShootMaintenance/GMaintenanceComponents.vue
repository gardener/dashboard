<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="ml-3">
    <div
      v-if="configStore.hideAutoUpdate"
      class="text-subtitle-1 pt-4"
    >
      {{ title }}
    </div>
    <template v-if="!workerless && configStore.hideAutoUpdate">
      <div
        v-if="!readonly || osUpdates"
        class="d-flex mt-4"
      >
        <div class="d-flex align-center justify-center action-select">
          <v-checkbox
            v-if="!readonly"
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
    </template>
    <div
      v-if="(!readonly || k8sUpdates) && configStore.hideAutoUpdate"
      class="d-flex mt-4"
    >
      <div class="d-flex align-center justify-center action-select">
        <v-checkbox
          v-if="!readonly"
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
      v-if="!readonly"
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

import { useConfigStore } from '@/store/config'

const configStore = useConfigStore()

const props = defineProps({
  title: {
    type: String,
    default: 'Auto Update',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  workerless: {
    type: Boolean,
    default: false,
  },
  autoUpdateKubernetesVersion: {
    type: Boolean,
    default: false,
  },
  autoUpdateMachineImageVersion: {
    type: Boolean,
    default: false,
  },
})
const {
  title,
  readonly,
  workerless,
} = toRefs(props)

const emit = defineEmits([
  'update:autoUpdateKubernetesVersion',
  'update:autoUpdateMachineImageVersion',
])

const k8sUpdates = computed({
  get () {
    return props.autoUpdateKubernetesVersion
  },
  set (value) {
    emit('update:autoUpdateKubernetesVersion', value)
  },
})

const osUpdates = computed({
  get () {
    return props.autoUpdateMachineImageVersion
  },
  set (value) {
    emit('update:autoUpdateMachineImageVersion', value)
  },
})

const showNoUpdates = computed(() => {
  return !props.readonly && !props.autoUpdateMachineImageVersion && !props.autoUpdateKubernetesVersion
})
</script>

<style lang="scss" scoped>
.action-select {
  min-width: 48px;
}
</style>
