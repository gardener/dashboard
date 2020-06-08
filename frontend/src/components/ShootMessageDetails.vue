<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-list>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="cyan darken-2">info_outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-subtitle>Status</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1">
          {{statusTitle}}
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <v-divider inset></v-divider>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="cyan darken-2">mdi-post-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-subtitle>Last Message</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1 message-block">
          <ansi-text v-if="!!lastMessage" :text="lastMessage"></ansi-text>
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <v-divider inset></v-divider>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="cyan darken-2">mdi-clock-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-subtitle>Last Updated</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1">
          <lazy-component @show="showPlaceholder=false">
              <time-string :dateTime="operation.lastUpdateTime" :pointInTime="-1"></time-string>
            </lazy-component>
            <v-progress-circular v-if="showPlaceholder" indeterminate size="18" width="1"></v-progress-circular>
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <template v-if="lastErrorDescriptions.length">
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="error">mdi-alert-circle-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Last Errors</v-list-item-subtitle>
          <v-list-item-title class="d-flex flex-column align-left pt-1 message-block">
            <div v-for="(lastErrorDescription, index) in lastErrorDescriptions" :key="index">
              <v-divider v-if="index > 0" class="my-2"></v-divider>
              <v-alert
                v-for="({ description, userError }, index) in lastErrorDescription.errorCodeObjects" :key="index"
                color="error"
                dark
                :icon="userError ? 'mdi-account-alert' : 'mdi-alert'"
                :prominent="!!userError ? true : false"
              >
                <h4 v-if="userError">Action required</h4>
                {{description}}
              </v-alert>
              <ansi-text class="error--text" :text="lastErrorDescription.description"></ansi-text>
            </div>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </template>
  </v-list>
</template>

<script>
import AnsiText from '@/components/AnsiText'
import map from 'lodash/map'
import { objectsFromErrorCodes } from '@/utils/errorCodes'
import VueLazyload from 'vue-lazyload'
import Vue from 'vue'
import TimeString from '@/components/TimeString'

Vue.use(VueLazyload, {
  lazyComponent: true
})

export default {
  components: {
    AnsiText,
    TimeString
  },
  props: {
    operation: {
      type: Object,
      required: true
    },
    statusTitle: {
      type: String,
      required: true
    },
    lastErrors: {
      type: Array,
      required: false
    }
  },
  data () {
    return {
      showPlaceholder: true
    }
  },
  computed: {
    lastErrorDescriptions () {
      return map(this.lastErrors, lastError => ({
        description: lastError.description,
        errorCodeObjects: objectsFromErrorCodes(lastError.codes)
      }))
    },
    lastMessage () {
      let message = this.operation.description
      message = message || 'No description'
      if (message === this.lastErrorDescription) {
        return undefined
      }
      return message
    }
  }
}
</script>

<style lang="scss" scoped>

  .message-block {
    max-height: 250px;
    overflow-y: scroll;
  }

</style>
