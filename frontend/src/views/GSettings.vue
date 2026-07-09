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
          <g-toolbar title="Global" />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-theme-light-dark
                </v-icon>
              </template>
              <g-list-item-content label="Color Scheme">
                <v-btn-toggle
                  v-model="colorScheme"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1"
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
              </g-list-item-content>
            </g-list-item>
            <v-divider inset />
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-bug
                </v-icon>
              </template>
              <g-list-item-content label="Log Level">
                <v-btn-toggle
                  v-model="logLevel"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1"
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
                    <span class="text-lowercase text-body-small">{{ text }}</span>
                  </v-btn>
                </v-btn-toggle>
              </g-list-item-content>
            </g-list-item>
            <v-divider inset />
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-login
                </v-icon>
              </template>
              <g-list-item-content
                label="Automatic Login"
                description="Skip the login screen if no user input is required"
              />
              <template #append>
                <v-switch
                  v-model="autoLogin"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </template>
            </g-list-item>
            <template v-if="isShootAdminKubeconfigEnabled">
              <v-divider inset />
              <g-list-item>
                <template #prepend>
                  <v-icon color="primary">
                    mdi-file-key-outline
                  </v-icon>
                </template>
                <g-list-item-content label="Cluster Time-Limited Kubeconfig Lifetime">
                  <v-select
                    v-model="shootAdminKubeconfigExpiration"
                    :items="shootAdminKubeconfigExpirationItems"
                    variant="solo-filled"
                    density="compact"
                    flat
                    single-line
                    hide-details
                    class="mt-1"
                    style="max-width: 200px;"
                  />
                </g-list-item-content>
              </g-list-item>
            </template>
          </g-list>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card class="mt-4">
          <g-toolbar title="Advanced" />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon color="primary">
                  mdi-cog-outline
                </v-icon>
              </template>
              <g-list-item-content
                label="Operator Features"
                description="Show the Issue Since column and Focus mode in project cluster lists to help identify and triage clusters with issues"
              />
              <template #append>
                <v-switch
                  v-model="operatorFeatures"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </template>
            </g-list-item>
          </g-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useLocalStorageStore } from '@/store/localStorage'

import { useShootAdminKubeconfig } from '@/composables/useShootAdminKubeconfig'

const localStorageStore = useLocalStorageStore()
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
