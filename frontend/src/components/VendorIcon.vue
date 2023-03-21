<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar :class="{ 'icon-background' : !noBackground }" small :size="size" :max-height="size" :max-width="size" class="rounded-lg" tile>
    <img v-if="iconSrc" :src="iconSrc" :style="iconStyle" :alt="`${value} logo`" class="rounded-0">
    <v-icon v-else-if="isMdiIcon" class="primary--text" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else class="primary--text" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </v-avatar>
</template>

<script>
import { mapState } from 'vuex'
import startsWith from 'lodash/startsWith'
import get from 'lodash/get'

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
    ...mapState([
      'cfg'
    ]),
    iconSrc () {
      const customCloudProviderIcon = get(this.cfg, ['vendors', this.value, 'icon'])
      if (customCloudProviderIcon) {
        return `/static/vendor-assets/${customCloudProviderIcon}`
      }

      // If filename is different from value you need to specify this below
      switch (this.value) {
        case 'azure-private-dns':
          return require('@/assets/azure-dns.svg')
        case 'openstack-designate':
          return require('@/assets/openstack.svg')

        case 'suse-jeos':
          return require('@/assets/suse.svg')
        case 'suse-chost':
          return require('@/assets/suse.svg')
        case 'ubuntu':
          return require('@/assets/ubuntu.svg')
      }

      try {
        return require(`@/assets/${this.value}.svg`)
      } catch (err) {
        return undefined
      }
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
