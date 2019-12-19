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
    <v-icon v-else :class="contentClass" style="font-size:1.5em">{{value}}</v-icon>
  </span>
</template>

<script>

export default {
  props: {
    value: {
      type: String,
      required: true
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
        case 'vmware':
          return require('@/assets/vmware.svg')
        case 'china-telecom':
          return require('@/assets/china-telecom.svg')
        case 'coreos':
          return require('@/assets/coreos.svg')
        case 'suse-jeos':
          return require('@/assets/suse.svg')
        case 'ubuntu':
          return require('@/assets/ubuntu.svg')
        case 'metal':
          return require('@/assets/metal.svg')
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
    }
  }
}
</script>
