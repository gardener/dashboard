<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popover
    v-model="popover"
    :z-index="2500"
    placement="bottom"
    toolbar-title="Max Worker Nodes"
  >
    <template #activator="{ props }">
      <g-action-button
        v-bind="props"
        icon="mdi-information-outline"
        tooltip="Show information about Max Worker Nodes"
        :tooltip-disabled="popover"
      />
    </template>
    <template #text>
      <div class="wrapper">
        <div class="text-title-large text-grey-darken-1 mb-4">
          Max Worker Nodes
        </div>
        <p>
          <ul>
            <li>Your Node CIDR mask size (<span class="font-family-monospace">.spec.kubernetes.kubeControllerManager.nodeCIDRMaskSize</span>) is configured with <span class="font-family-monospace">/{{ getNodeCIDRMaskSize }}</span> mask size.</li>
            <li>Your Pod network (<span class="font-family-monospace">.spec.networking.pods</span>) is configured with a <span class="font-family-monospace">/{{ podsCidrPrefix }}</span> mask size, allowing for  <span class="font-family-monospace">2<sup>({{ getNodeCIDRMaskSize }}-{{ podsCidrPrefix }})</sup> = 2<sup>{{ getNodeCIDRMaskSize - podsCidrPrefix }}</sup> = {{ maxNodeCount }}</span> Nodes.</li>
            <li>Your Node network (<span class="font-family-monospace">.spec.networking.nodes</span>) is configured with a <span class="font-family-monospace">/{{ nodesCidrCidrPrefix }}</span> mask size, allowing for  <span class="font-family-monospace"> 2<sup>{{ 32 - nodesCidrCidrPrefix }}</sup> = {{ maxNodeIps }}</span> Node ips</li>
          </ul>
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
  podsCidr,
  nodesCidr,
  nodeCIDRMaskSize,
} = useShootItem()

const getNodeCIDRMaskSize = computed(() => {
  return nodeCIDRMaskSize.value
})

const podsCidrPrefix = computed(() => {
  return podsCidr?.value?.split('/')[1]
})

const nodesCidrCidrPrefix = computed(() => {
  return nodesCidr?.value?.split('/')[1]
})

const maxNodeIps = computed(() => {
  return Math.pow(2, 32 - nodesCidrCidrPrefix.value)
})

const maxNodeCount = computed(() => {
  return Math.pow(2, nodeCIDRMaskSize.value - podsCidrPrefix.value)
})

</script>
<style scoped>
  ul {
    margin-left: 10px;
  }
  li {
    margin-left: 10px;
  }
  li + li {
    margin-top: 10px;
  }
  p + p {
    margin-top: 10px;
  }
  .wrapper {
    max-width: 700px;
  }
</style>
