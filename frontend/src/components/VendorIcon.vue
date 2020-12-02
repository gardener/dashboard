<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span>
    <img v-if="iconSrc" :src="iconSrc" :width="getWidth" :height="getHeight" :class="contentClass" style="vertical-align:middle">
    <v-icon v-else-if="isMdiIcon" :class="contentClass" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else :class="contentClass" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </span>
</template>

<script>
import startsWith from 'lodash/startsWith'

export default {
  props: {
    value: {
      type: String
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    contentClass: {
      type: String,
      default: ''
    }
  },
  computed: {
    iconSrc () {
      switch (this.value) {
        case 'digital-ocean':
          return require('@/assets/digital-ocean.svg')
        case 'china-telecom':
          return require('@/assets/china-telecom.svg')
        case 'coreos':
          return require('@/assets/coreos.svg')
        case 'suse-jeos':
          return require('@/assets/suse.svg')
        case 'suse-chost':
          return require('@/assets/suse.svg')
        case 'ubuntu':
          return require('@/assets/ubuntu.svg')
        case 'gardenlinux':
          return require('@/assets/logo.svg')
      }
      return undefined
    },
    getHeight () {
      return this.height
    },
    getWidth () {
      if (!this.width && !this.height) {
        return 20
      }
      return this.width
    },
    isMdiIcon () {
      return startsWith(this.value, 'mdi-')
    }
  }
}
</script>
