<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar :color="darkMode && !noDarkModeBackground ? 'grey darken-2' : undefined" small :size="size" v-on="inputListeners">
    <img v-if="iconSrc" :src="iconSrc">
    <v-icon v-else-if="isMdiIcon" class="primary--text" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else class="primary--text" style="font-size:1.5em">mdi-blur-radial</v-icon>
  </v-avatar>
</template>

<script>
import startsWith from 'lodash/startsWith'
import { mapState } from 'vuex'

export default {
  data () {
    return {
      backgroundDivSize: undefined
    }
  },
  props: {
    value: {
      type: String
    },
    size: {
      type: Number,
      default: 24
    },
    noDarkModeBackground: {
      type: Boolean
    }
  },
  computed: {
    ...mapState([
      'darkMode'
    ]),
    inputListeners: function () {
      var vm = this
      return Object.assign({},
        this.$listeners,
        {
          input: function (event) {
            vm.$emit('input', event.target.value)
          }
        }
      )
    },
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
          return require('@/assets/logo.svg')
      }
      return undefined
    },
    isMdiIcon () {
      return startsWith(this.value, 'mdi-')
    }
  }
}
</script>
