<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-alert :type="expirationAlertType" outline value="true" v-if="expirationTimestamp && isAlertType">
    <span v-if="isValidTerminationDate">This cluster will self terminate<span class="bold"><time-string :date-time="expirationTimestamp"></time-string></span></span>
    <span v-else>This cluster is about to self terminate</span>
  </v-alert>
  <v-tooltip top v-else-if="expirationTimestamp">
    <template slot="activator">
      <v-icon color="warning" class="terminationIcon" v-if="isSelfTerminationWarning">mdi-clock-alert</v-icon>
      <v-icon color="cyan darken-2" class="terminationIcon" v-else>mdi-clock</v-icon>
    </template>
    <span v-if="isValidTerminationDate">This cluster will self terminate<span class="bold"><time-string :date-time="expirationTimestamp"></time-string></span></span>
    <span v-else>This cluster is about to self terminate</span>
  </v-tooltip>
</template>

<script>
  import TimeString from '@/components/TimeString'

  export default {
    name: 'selfTerminationWarning',
    components: {
      TimeString
    },
    props: {
      expirationTimestamp: {
        type: String
      },
      type: {
        type: String
      }
    },
    computed: {
      isValidTerminationDate () {
        return new Date(this.expirationTimestamp) > new Date()
      },
      isSelfTerminationWarning () {
        return this.expirationTimestamp && new Date(this.expirationTimestamp) - new Date() < 24 * 60 * 60 * 1000 // 1 day
      },
      isAlertType () {
        return this.type === 'alert'
      },
      expirationAlertType () {
        return this.isSelfTerminationWarning ? 'warning' : 'info'
      }
    }
  }
</script>

<style lang="styl" scoped>
  .terminationIcon {
    margin-left: 10px;
  }

  .bold {
    font-weight: bold;
  }
</style>