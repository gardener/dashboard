<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="px-6"
  >
    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mt-4">
          <v-toolbar
            flat
            density="compact"
            class="bg-toolbar-background text-toolbar-title"
          >
            <v-toolbar-title>Global</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-row>
              <v-col
                v-if="!sapTheme"
                cols="12"
              >
                <legend class="text-medium-emphasis">
                  Color Scheme
                </legend>
                <v-btn-toggle
                  v-model="colorScheme"
                  label="Color Scheme"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1 h-75"
                >
                  <v-btn
                    v-tooltip:top="'Light Mode'"
                    value="light"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-white-balance-sunny" />
                  </v-btn>
                  <v-btn
                    v-tooltip:top="'Dark Mode'"
                    value="dark"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-weather-night" />
                  </v-btn>
                  <v-btn
                    v-tooltip:top="'Automatically choose theme based on your system settings'"
                    value="auto"
                    variant="tonal"
                    min-width="36"
                  >
                    <v-icon icon="mdi-brightness-auto" />
                  </v-btn>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <legend class="text-medium-emphasis">
                  Log Level
                </legend>
                <v-btn-toggle
                  v-model="logLevel"
                  label="Log Level"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1 h-75"
                >
                  <v-btn
                    v-for="{ value, text, icon, color } in logLevels"
                    :key="value"
                    :value="value"
                    variant="tonal"
                    :prepend-icon="icon"
                  >
                    <template #prepend>
                      <v-icon :color="color" />
                    </template>
                    <span class="text-lowercase text-caption">{{ text }}</span>
                  </v-btn>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="autoLogin"
                  label="Automatic Login"
                  color="primary"
                  persistent-hint
                  density="compact"
                  hint="Skip the login screen if no user input is required"
                />
              </v-col>
              <v-col
                v-if="isShootAdminKubeconfigEnabled"
                cols="12"
              >
                <legend class="text-medium-emphasis">
                  Cluster Time-Limited Kubeconfig Lifetime
                </legend>
                <v-select
                  v-model="shootAdminKubeconfigExpiration"
                  :items="shootAdminKubeconfigExpirationItems"
                  variant="solo-filled"
                  density="compact"
                  flat
                  single-line
                  class="w-25"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mt-4">
          <v-toolbar
            flat
            density="compact"
            class="bg-toolbar-background text-toolbar-title"
          >
            <v-toolbar-title>Advanced</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="operatorFeatures"
                  label="Operator Features"
                  color="primary"
                  density="compact"
                  persistent-hint
                  hint="Enable operator features for project cluster lists"
                >
                  <template #message="{ message }">
                    <div
                      class="font-weight-bold pb-1"
                      v-text="message"
                    />
                    You can set the focus mode for cluster lists. This mode will freeze the current
                    list and allows to get an overview of clusters with issues by sorting the list by
                    the <span class="font-family-monospace">ISSUE SINCE</span> column.
                  </template>
                </v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouteQuery } from '@vueuse/router'

import { useLocalStorageStore } from '@/store/localStorage'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'

const localStorageStore = useLocalStorageStore()
const sapTheme = useRouteQuery('sap-theme')
const shootAdminKubeconfig = useShootAdminKubeconfig()
const {
  expirations: shootAdminKubeconfigExpirations,
  isEnabled: isShootAdminKubeconfigEnabled,
  expiration: shootAdminKubeconfigExpiration,
  humanizeExpiration,
} = shootAdminKubeconfig

const logLevels = [
  { value: 'debug', text: 'verbose', icon: 'mdi-bug', color: 'grey darken-4' },
  { value: 'info', text: 'info', icon: 'mdi-information', color: 'blue darken-2' },
  { value: 'warn', text: 'warning', icon: 'mdi-alert', color: 'warning' },
  { value: 'error', text: 'error', icon: 'mdi-close-circle', color: 'error' },
  { value: 'silent', text: 'silent', icon: 'mdi-pause-octagon', color: 'grey' },
]

const {
  logLevel,
  autoLogin,
  colorScheme,
  operatorFeatures,
} = storeToRefs(localStorageStore)

const shootAdminKubeconfigExpirationItems = computed(() => {
  return shootAdminKubeconfigExpirations.value.map(value => {
    return {
      value,
      title: humanizeExpiration(value),
    }
  })
})
</script>

<style lang="scss" scoped>
:deep(.v-messages__message) {
  line-height: 14px;
}
</style>
