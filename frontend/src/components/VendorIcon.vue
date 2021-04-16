<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar :color="darkTheme && !lightBackground ? 'grey darken-2' : undefined" small :size="size" class="rounded-lg" tile>
    <img v-if="iconSrc" :src="iconSrc" :style="iconStyle" class="rounded-0">
    <v-icon v-else-if="isMdiIcon" class="primary--text" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else class="primary--text" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </v-avatar>
</template>

<script>
import startsWith from 'lodash/startsWith'
import { mapState } from 'vuex'

export default {
  props: {
    value: {
      type: String
    },
    size: {
      type: Number,
      default: 24
    },
    lightBackground: {
      type: Boolean
    }
  },
  computed: {
    ...mapState([
      'darkTheme'
    ]),
    iconSrc () {
      switch (this.value) {
        // infrastructures
        case 'azure':
          return require('@/assets/azure.svg')
        case 'aws':
          return require('@/assets/aws.svg')
        case 'gcp':
          return require('@/assets/gcp.svg')
        case 'openstack':
          return require('@/assets/openstack.svg')
        case 'alicloud':
          return require('@/assets/alicloud.svg')
        case 'vsphere':
          return require('@/assets/vsphere.svg')
        case 'metal':
          return require('@/assets/metal.svg')

        // dns
        case 'aws-route53':
          return require('@/assets/aws-route53.svg')
        case 'azure-dns':
          return require('@/assets/azure-dns.svg')
        case 'google-clouddns':
          return require('@/assets/google-clouddns.svg')
        case 'openstack-designate':
          return require('@/assets/openstack.svg')
        case 'alicloud-dns':
          return require('@/assets/alicloud-dns.png')
        case 'cloudflare':
          return require('@/assets/cloudflare.svg')
        case 'infoblox':
          return require('@/assets/infoblox.svg')
        case 'netlify':
          return require('@/assets/netlify.svg')

        // os
        case 'coreos':
          return require('@/assets/coreos.svg')
        case 'suse-jeos':
          return require('@/assets/suse.svg')
        case 'suse-chost':
          return require('@/assets/suse.svg')
        case 'ubuntu':
          return require('@/assets/ubuntu.svg')
        case 'gardenlinux':
          return require('@/assets/gardenlinux.svg')
        case 'flatcar':
          return require('@/assets/flatcar.svg')
        case 'memoryone':
          return require('@/assets/vsmp-memoryone.svg')
      }
      return undefined
    },
    isMdiIcon () {
      return startsWith(this.value, 'mdi-')
    },
    iconStyle () {
      const maxIconSize = this.size - 4
      return {
        maxHeight: `${maxIconSize}px`,
        maxWidth: `${maxIconSize}px`
      }
    }
  }
}
</script>
