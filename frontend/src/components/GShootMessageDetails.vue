<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list class="text-left">
    <g-list-item>
      <template #prepend>
        <v-icon
          color="primary"
          icon="mdi-information-outline"
        />
      </template>
      <g-list-item-content label="Status">
        {{ statusTitle }}
      </g-list-item-content>
    </g-list-item>
    <template v-if="!!lastMessage">
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon
            color="primary"
            icon="mdi-post-outline"
          />
        </template>
        <g-list-item-content label="Last Message">
          <div class="message-block">
            <g-ansi-text :text="lastMessage" />
          </div>
        </g-list-item-content>
      </g-list-item>
    </template>
    <v-divider inset />
    <g-list-item v-if="lastUpdateTime">
      <template #prepend>
        <v-icon
          color="primary"
          icon="mdi-clock-outline"
        />
      </template>
      <g-list-item-content label="Last Updated">
        <g-time-string
          :date-time="lastUpdateTime"
          mode="past"
        />
      </g-list-item-content>
    </g-list-item>
    <g-list-item v-if="lastTransitionTime">
      <g-list-item-content label="Last Status Change">
        <g-time-string
          :date-time="lastTransitionTime"
          mode="past"
        />
      </g-list-item-content>
    </g-list-item>
    <template v-if="hasError">
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon
            color="error"
            icon="mdi-alert-circle-outline"
          />
        </template>
        <g-list-item-content :label="errorDescriptions.length > 1 ? 'Last Errors' : 'Last Error'">
          <div class="message-block">
            <div
              v-for="(lastErrorDescription, index) in errorDescriptions"
              :key="index"
            >
              <v-divider
                v-if="index > 0"
                class="my-2"
              />
              <v-alert
                v-for="({ description, link, userError, infraAccountError }) in lastErrorDescription.errorCodeObjects"
                :key="description"
                type="error"
                :icon="userError ? 'mdi-account-alert' : 'mdi-alert'"
                :prominent="!!userError"
              >
                <template v-if="userError">
                  <h3>
                    Your Action is required
                  </h3>
                  <h4 class="wrap-text font-weight-bold">
                    This is a user-resolvable error — no Gardener operations team intervention needed.
                    Please read the error message carefully and take action.
                  </h4>
                </template>
                <span class="wrap-text">
                  <span v-if="infraAccountError">
                    There is a problem with the credential
                    <code v-if="shootBinding">
                      <g-binding-name
                        :binding="shootBinding"
                        render-link
                      />
                    </code>:
                  </span>
                  <span>{{ description }}</span>
                  <div v-if="link">
                    <g-external-link
                      :url="link.url"
                      class="inherit-color font-weight-bold"
                    >
                      {{ link.text }}
                    </g-external-link>
                  </div>
                </span>
              </v-alert>
              <g-ansi-text
                :text="lastErrorDescription.description"
                class="text-error"
              />
            </div>
          </div>
        </g-list-item-content>
      </g-list-item>
    </template>
  </g-list>
</template>

<script>

import GAnsiText from '@/components/GAnsiText.vue'
import GBindingName from '@/components/Credentials/GBindingName.vue'

import isEmpty from 'lodash/isEmpty'

export default {
  components: {
    GAnsiText,
    GBindingName,
  },
  props: {
    statusTitle: {
      type: String,
    },
    lastMessage: {
      type: String,
    },
    errorDescriptions: {
      type: Array,
    },
    lastUpdateTime: {
      type: String,
    },
    lastTransitionTime: {
      type: String,
    },
    shootBinding: {
      type: Object,
      default: null,
    },
  },
  computed: {
    hasError () {
      return !isEmpty(this.errorDescriptions)
    },
  },
}
</script>

<style lang="scss" scoped>
  .message-block {
    height: fit-content;
  }
</style>
