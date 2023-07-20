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
              <v-col cols="12">
                <legend class="text-secondary">
                  Color Scheme
                </legend>
                <v-btn-toggle
                  v-model="colorMode"
                  label="Color Scheme"
                  color="primary"
                  mandatory="force"
                  divided
                  density="compact"
                  class="mt-1 h-75"
                >
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-btn
                        value="light"
                        v-bind="props"
                        variant="tonal"
                        min-width="36"
                      >
                        <v-icon icon="mdi-white-balance-sunny" />
                      </v-btn>
                    </template>
                    <span>Light Mode</span>
                  </v-tooltip>
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-btn
                        value="dark"
                        v-bind="props"
                        variant="tonal"
                        min-width="36"
                      >
                        <v-icon icon="mdi-weather-night" />
                      </v-btn>
                    </template>
                    <span>Dark Mode</span>
                  </v-tooltip>
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-btn
                        value="auto"
                        v-bind="props"
                        variant="tonal"
                        min-width="36"
                      >
                        <v-icon icon="mdi-brightness-auto" />
                      </v-btn>
                    </template>
                    <span>Automatically choose theme based on your system settings</span>
                  </v-tooltip>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <legend class="text-secondary">
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
                  true-value="enabled"
                  false-value="disabled"
                  label="Automatic Login"
                  color="primary"
                  persistent-hint
                  density="compact"
                  hint="Skip the login screen if no user input is required"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      />
    </v-row>
  </v-container>
</template>

<script setup>
import { inject } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const logLevels = [
  { value: 'debug', text: 'verbose', icon: 'mdi-bug', color: 'grey darken-4' },
  { value: 'info', text: 'info', icon: 'mdi-information', color: 'blue darken-2' },
  { value: 'warn', text: 'warning', icon: 'mdi-alert', color: 'warning' },
  { value: 'error', text: 'error', icon: 'mdi-close-circle', color: 'error' },
  { value: 'silent', text: 'silent', icon: 'mdi-pause-octagon', color: 'grey' },
]

const { logLevel } = inject('logger')
const colorMode = inject('colorMode')
const autoLogin = useLocalStorage('global/auto-login')
</script>
