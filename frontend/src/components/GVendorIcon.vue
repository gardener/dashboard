<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar
    :size="size"
    rounded="lg"
    tile
    :class="{ 'icon-background': !noBackground }"
  >
    <img
      v-if="iconSrc"
      :src="iconSrc"
      :style="iconStyle"
      :alt="`${icon} logo`"
      class="rounded-0"
    >
    <v-icon
      v-else
      :icon="mdiIcon"
      class="text-primary"
      style="font-size:1.5em"
    />
  </v-avatar>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import startsWith from 'lodash/startsWith'

const props = defineProps({
  icon: {
    type: String,
    default: '',
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

const noBackground = toRef(props, 'noBackground')

const iconSrc = computed(() => {
  switch (props.icon) {
    // infrastructures
    case 'azure':
      return new URL('/src/assets/azure.svg', import.meta.url)
    case 'aws':
      return new URL('/src/assets/aws.svg', import.meta.url)
    case 'gcp':
      return new URL('/src/assets/gcp.svg', import.meta.url)
    case 'openstack':
      return new URL('/src/assets/openstack.svg', import.meta.url)
    case 'stackit':
      return new URL('/src/assets/stackit.svg', import.meta.url)
    case 'alicloud':
      return new URL('/src/assets/alicloud.svg', import.meta.url)
    case 'vsphere':
      return new URL('/src/assets/vsphere.svg', import.meta.url)
    case 'metal':
      return new URL('/src/assets/metal.svg', import.meta.url)
    case 'ironcore':
      return new URL('/src/assets/ironcore.svg', import.meta.url)
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
    case 'rfc2136':
      return new URL('/src/assets/rfc2136.svg', import.meta.url)
    case 'powerdns':
      return new URL('/src/assets/powerdns.svg', import.meta.url)

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

const mdiIcon = computed(() => {
  return startsWith(props.icon, 'mdi-')
    ? props.icon
    : 'mdi-blur-radial'
})

const iconStyle = computed(() => {
  const maxIconSize = props.size - 4
  return {
    maxHeight: `${maxIconSize}px`,
    maxWidth: `${maxIconSize}px`,
    height: `${maxIconSize}px`,
    width: `${maxIconSize}px`,
  }
})

</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

  .v-theme--dark .icon-background {
    background-color: map.get(vuetify.$grey, 'darken-2');
  }
</style>
