<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar :class="{ 'icon-background' : !noBackground }" small :size="size" class="rounded-lg" tile>
    <img v-if="iconSrc" :src="iconSrc" :style="iconStyle" :alt="`${value} logo`" class="rounded-0">
    <v-icon v-else-if="isMdiIcon" class="text-primary" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else class="text-primary" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </v-avatar>
</template>

<script setup>
import { computed, toRefs } from 'vue'
import startsWith from 'lodash/startsWith'

const props = defineProps({
  value: {
    type: String,
  },
  size: {
    type: Number,
    default: 24,
  },
  noBackground: {
    type: Boolean,
    default: false,
  },
})

const { value, size, noBackground } = toRefs(props)

const iconSrc = computed(() => {
  switch (value.value) {
    // infrastructures
    case 'azure':
      return new URL('/src/assets/azure.svg', import.meta.url)
    case 'aws':
      return new URL('/src/assets/aws.svg', import.meta.url)
    case 'gcp':
      return new URL('/src/assets/gcp.svg', import.meta.url)
    case 'openstack':
      return new URL('/src/assets/openstack.svg', import.meta.url)
    case 'alicloud':
      return new URL('/src/assets/alicloud.svg', import.meta.url)
    case 'vsphere':
      return new URL('/src/assets/vsphere.svg', import.meta.url)
    case 'metal':
      return new URL('/src/assets/metal.svg', import.meta.url)
    case 'onmetal':
      return new URL('/src/assets/onmetal.svg', import.meta.url)
    // dns
    case 'aws-route53':
      return new URL('/src/assets/aws-route53.svg', import.meta.url)
    case 'azure-dns':
    case 'azure-private-dns':
      return new URL('/src/assets/azure-dns.svg', import.meta.url)
    case 'google-clouddns':
      return new URL('/src/assets/google-clouddns.svg', import.meta.url)
    case 'openstack-designate':
      return new URL('/src/assets/openstack.svg', import.meta.url)
    case 'alicloud-dns':
      return new URL('/src/assets/alicloud-dns.png', import.meta.url)
    case 'cloudflare-dns':
      return new URL('/src/assets/cloudflare-dns.svg', import.meta.url)
    case 'infoblox-dns':
      return new URL('/src/assets/infoblox-dns.svg', import.meta.url)
    case 'netlify-dns':
      return new URL('/src/assets/netlify-dns.svg', import.meta.url)

    // os
    case 'coreos':
      return new URL('/src/assets/coreos.svg', import.meta.url)
    case 'suse-jeos':
      return new URL('/src/assets/suse.svg', import.meta.url)
    case 'suse-chost':
      return new URL('/src/assets/suse.svg', import.meta.url)
    case 'ubuntu':
      return new URL('/src/assets/ubuntu.svg', import.meta.url)
    case 'gardenlinux':
      return new URL('/src/assets/gardenlinux.svg', import.meta.url)
    case 'flatcar':
      return new URL('/src/assets/flatcar.svg', import.meta.url)
    case 'hcloud':
      return new URL('/src/assets/hcloud.svg', import.meta.url)
  }

  return undefined
})

const isMdiIcon = computed(() => {
  return startsWith(value.value, 'mdi-')
})

const iconStyle = computed(() => {
  const maxIconSize = size.value - 4
  return {
    maxHeight: `${maxIconSize}px`,
    maxWidth: `${maxIconSize}px`,
  }
})

</script>

<style lang="scss" scoped>
  @import 'vuetify/settings';

  $grey-darken-2: map-get($grey, 'darken-2');

  .theme--dark .icon-background {
    background-color: $grey-darken-2
  }
</style>
