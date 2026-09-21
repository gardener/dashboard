<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :z-index="2500"
    placement="bottom"
    toolbar-title="Max Pods per Node"
  >
    <template #activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-information-outline"
        tooltip="Show information about Max Pods per Node"
        :tooltip-disabled="popover"
      />
    </template>
    <template #text>
      <div class="wrapper">
        <div class="text-title-large text-grey-darken-1 mb-4">
          Max Pods per Node
        </div>
        <p v-if="hasIpv4 && getNodeCIDRMaskSize">
          Your Node CIDR mask size (<span class="font-family-monospace">.spec.kubernetes.kubeControllerManager.nodeCIDRMaskSize</span>)
          is configured with <span class="font-family-monospace">/{{ getNodeCIDRMaskSize }}</span> allowing for <span class="font-family-monospace">2<sup>{{ 32 - getNodeCIDRMaskSize }}</sup> = {{ maxPodsPerNodeCount }}</span> Pods per Node.
        </p>
        <p>
          Further information about the shoot networking can be found
          <g-external-link url="https://gardener.cloud/docs/gardener/networking/shoot_networking/">
            here
          </g-external-link>
          .
        </p>
      </div>
    </template>
  </g-popover>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'

import { useShootItem } from '@/composables/useShootItem'

const popover = ref(false)

const {
  nodeCIDRMaskSize,
  hasIpv4,
} = useShootItem()

const getNodeCIDRMaskSize = computed(() => {
  return nodeCIDRMaskSize.value
})

const maxPodsPerNodeCount = computed(() => {
  return Math.pow(2, 32 - nodeCIDRMaskSize.value)
})
</script>

<style scoped>
  .wrapper {
    max-width: 700px;
  }
  p + p {
    margin-top: 10px;
  }
</style>
