<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar :class="{ 'icon-background' : !noBackground }" small :size="size" class="rounded-lg" tile>
    <img v-if="iconSrc" :src="iconSrc" :style="iconStyle" class="rounded-0">
    <v-icon v-else-if="isMdiIcon" class="primary--text" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else class="primary--text" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </v-avatar>
</template>

<script>
import startsWith from 'lodash/startsWith'

export default {
  props: {
    value: {
      type: String
    },
    size: {
      type: Number,
      default: 24
    },
    noBackground: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    iconSrc () {
      switch (this.value) {
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
        case 'coreos':
          return require('@/assets/coreos.svg')
        case 'suse-jeos':
          return require('@/assets/suse.svg')
        case 'suse-chost':
          return require('@/assets/suse.svg')
        case 'ubuntu':
          return require('@/assets/ubuntu.svg')
        case 'metal':
          return require('@/assets/metal.svg')
        case 'gardenlinux':
          return require('@/assets/gardenlinux.svg')
        case 'hcloud':
          return require('@/assets/hcloud.svg')
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

<style lang="scss" scoped>
  @import '~vuetify/src/styles/styles.sass';

  $grey-darken-2: map-get($grey, 'darken-2');

  .theme--dark .icon-background {
    background-color: $grey-darken-2
  }
</style>
