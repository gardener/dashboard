<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <span>
    <img v-if="iconSrc" :src="iconSrc" :width="getWidth" :height="getHeight" :class="contentClass" style="vertical-align:middle">
    <v-icon v-else-if="isMdiIcon" :class="contentClass" style="font-size:1.5em">{{value}}</v-icon>
    <v-icon v-else :class="contentClass" class="cyan--text text--darken-2" style="font-size:1.5em">mdi-blur-radial</v-icon>
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
        case 'azure':
          return require('@/assets/azure.svg')
        case 'azure-white':
          return require('@/assets/azure-white.svg')
        case 'aws':
          return require('@/assets/aws.svg')
        case 'aws-white':
          return require('@/assets/aws-white.svg')
        case 'gcp':
          return require('@/assets/gcp.svg')
        case 'gcp-white':
          return require('@/assets/gcp-white.svg')
        case 'openstack':
          return require('@/assets/openstack.svg')
        case 'openstack-white':
          return require('@/assets/openstack-white.svg')
        case 'alicloud':
          return require('@/assets/alicloud.svg')
        case 'alicloud-white':
          return require('@/assets/alicloud-white.svg')
        case 'digital-ocean':
          return require('@/assets/digital-ocean.svg')
        case 'vsphere':
          return require('@/assets/vsphere.svg')
        case 'vsphere-white':
          return require('@/assets/vsphere-white.svg')
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
        case 'metal':
          return require('@/assets/metal.svg')
        case 'metal-white':
          return require('@/assets/metal-white.svg')
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
