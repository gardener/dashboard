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
  <g-popper
    title="No Hibernation Schedule"
    toolbarColor="cyan darken-2"
    :popperKey="`no_hibernation_${namespace}/${name}`"
  >
  <div slot="content-before" class="message">
    To reduce expenses, <span class="bold">{{purposeText}}</span> clusters get a hibernation schedule by default.
    However, this cluster does not have a hibernation schedule. Please navigate to the cluster details page to
    <router-link  class="cyan--text text--darken-2" :to="{ name: 'ShootItemHibernationSettings', params: { name, namespace } }">
      configure
    </router-link>
    a hibernation schedule or explicitly deactivate scheduled hibernation for this cluster.
  </div>
    <v-tooltip top slot="popperRef">
      <v-icon slot="activator" color="cyan darken-2" class="cursor-pointer">mdi-calendar-alert</v-icon>
      <span>No Hibernation Schedule</span>
    </v-tooltip>
  </g-popper>

</template>

<script>
import GPopper from '@/components/GPopper'

export default {
  name: 'hibernationschedulewarning',
  components: {
    GPopper
  },
  props: {
    name: {
      type: String
    },
    namespace: {
      type: String
    },
    purpose: {
      type: String
    }
  },
  computed: {
    popperKeyWithType () {
      return `shootStatus_${this.popperKey}`
    },
    purposeText () {
      return this.purpose || ''
    }
  }
}
</script>

<style lang="styl" scoped>
  .cursor-pointer {
    cursor: pointer;
  }
  .bold {
    font-weight: bold;
  }
  .message {
    text-align: left;
    min-width: 250px;
    max-width: 800px;
    white-space: normal;
    overflow-y: auto;
  }
</style>
