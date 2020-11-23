<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="primary">mdi-information-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-subtitle>Status</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1">
          {{statusTitle}}
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <template v-if="!!lastMessage">
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-post-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Last Message</v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1 message-block">
            <ansi-text :text="lastMessage"></ansi-text>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </template>
    <v-divider inset></v-divider>
    <v-list-item v-if="lastUpdateTime">
      <v-list-item-icon>
        <v-icon color="primary">mdi-clock-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-subtitle>Last Updated</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1">
          <v-lazy>
            <time-string :dateTime="lastUpdateTime" mode="past"></time-string>
          </v-lazy>
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
     <v-list-item v-if="lastTransitionTime">
      <v-list-item-icon />
      <v-list-item-content>
        <v-list-item-subtitle>Last Status Change</v-list-item-subtitle>
        <v-list-item-title class="d-flex align-center pt-1">
          <v-lazy>
            <time-string :dateTime="lastTransitionTime" mode="past"></time-string>
          </v-lazy>
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>
    <template v-if="hasError">
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="error">mdi-alert-circle-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>{{errorDescriptions.length > 1 ? 'Last Errors' : 'Last Error'}}</v-list-item-subtitle>
          <v-list-item-title class="d-flex flex-column align-left pt-1 message-block">
            <div v-for="(lastErrorDescription, index) in errorDescriptions" :key="index">
              <v-divider v-if="index > 0" class="my-2"></v-divider>
              <v-alert
                v-for="({ description, userError, infraAccountError }) in lastErrorDescription.errorCodeObjects" :key="description"
                color="error"
                dark
                :icon="userError ? 'mdi-account-alert' : 'mdi-alert'"
                :prominent="!!userError ? true : false"
              >
                <h4 v-if="userError">Action required</h4>
                <span class="wrap">
                  <span v-if="infraAccountError">There is a problem with your secret
                    <code>
                      <router-link v-if="canLinkToSecret"
                        :to="{ name: 'Secret', params: { name: secretBindingName, namespace: namespace } }"
                      >
                        <span>{{secretBindingName}}</span>
                      </router-link>
                      <span v-else>{{secretBindingName}}</span>
                    </code>:</span>
                  {{description}}
                </span>
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
import TimeString from '@/components/TimeString'
import isEmpty from 'lodash/isEmpty'

export default {
  components: {
    AnsiText,
    TimeString
  },
  props: {
    statusTitle: {
      type: String
    },
    lastMessage: {
      type: String
    },
    errorDescriptions: {
      type: Array
    },
    lastUpdateTime: {
      type: String
    },
    lastTransitionTime: {
      type: String
    },
    secretBindingName: {
      type: String
    },
    namespace: {
      type: String
    }
  },
  computed: {
    hasError () {
      return !isEmpty(this.errorDescriptions)
    },
    canLinkToSecret () {
      return this.secretBindingName && this.namespace
    }
  }
}
</script>

<style lang="scss" scoped>

  .message-block {
    max-height: 230px;
    overflow-y: scroll;
  }

  .wrap {
    white-space: pre-wrap;
  }

</style>
