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
        <div v-if="getNodeCIDRMaskSize && podsCidrPrefix && nodesCidrCidrPrefix">
          <ul>
            <li>Your Node CIDR mask size (<span class="font-family-monospace">.spec.kubernetes.kubeControllerManager.nodeCIDRMaskSize</span>) is configured with <span class="font-family-monospace">/{{ getNodeCIDRMaskSize }}</span> mask size.</li>
            <li>Your Pod network (<span class="font-family-monospace">.spec.networking.pods</span>) is configured with a <span class="font-family-monospace">/{{ podsCidrPrefix }}</span> mask size, allowing for  <span class="font-family-monospace">2<sup>({{ getNodeCIDRMaskSize }}-{{ podsCidrPrefix }})</sup> = 2<sup>{{ getNodeCIDRMaskSize - podsCidrPrefix }}</sup> = {{ maxNodeCount }}</span> Nodes.</li>
            <li>Your Node network (<span class="font-family-monospace">.spec.networking.nodes</span>) is configured with a <span class="font-family-monospace">/{{ nodesCidrCidrPrefix }}</span> mask size, allowing for  <span class="font-family-monospace"> 2<sup>{{ ipBitLength - nodesCidrCidrPrefix }}</sup> = {{ maxNodeIps }}</span> Node ips</li>
          </ul>
        </div>
        <div v-else>
          The calculation is not possible because following values are missing:
          <ul>
            <li v-if="!getNodeCIDRMaskSize">
              Node CIDR mask size (<span class="font-family-monospace">.spec.kubernetes.kubeControllerManager.nodeCIDRMaskSize</span>)
            </li>
            <li v-if="!podsCidrPrefix">
              Pod network (<span class="font-family-monospace">.spec.networking.pods</span>)
            </li>
            <li v-if="!nodesCidrCidrPrefix">
              Node network (<span class="font-family-monospace">.spec.networking.nodes</span>)
            </li>
          </ul>
        </div>
        <br>
        <div>
          Further information about the shoot networking can be found
          <g-external-link url="https://gardener.cloud/docs/gardener/networking/shoot_networking/">
            here
          </g-external-link>
          .
        </div>
      </div>
    </template>
  </g-popover>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'
import { Netmask } from 'netmask'

import { useShootItem } from '@/composables/useShootItem'

import { isIpv4Cidr } from '@/utils'

const popover = ref(false)

const {
  podsCidr,
  podsCidrSpec,
  nodesCidr,
  nodesCidrSpec,
  nodeCIDRMaskSize,
  hasIpv4,
} = useShootItem()

const getNodeCIDRMaskSize = computed(() => {
  return nodeCIDRMaskSize.value
})

const podsCidrPrefix = computed(() => {
  const cidr = podsCidr.value?.find(isIpv4Cidr) || podsCidr.value?.[0] || podsCidrSpec.value
  const netmask = new Netmask(cidr)
  return netmask?.bitmask
})

const nodesCidrCidrPrefix = computed(() => {
  const cidr = nodesCidr.value?.find(isIpv4Cidr) || nodesCidr.value?.[0] || nodesCidrSpec.value
  const netmask = new Netmask(cidr)
  return netmask?.bitmask
})

const ipBitLength = computed(() => {
  return hasIpv4.value ? 32 : 128
})

const maxNodeIps = computed(() => {
  return Math.pow(2, ipBitLength.value - nodesCidrCidrPrefix.value)
})

const maxNodeCount = computed(() => {
  return Math.pow(2, nodeCIDRMaskSize.value - podsCidrPrefix.value)
})

</script>
<style scoped>
  ul {
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
