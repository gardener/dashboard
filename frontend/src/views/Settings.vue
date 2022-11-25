<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid class="px-6">
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mt-4">
          <v-toolbar flat dense class="toolbar-background toolbar-title--text">
            <v-toolbar-title>Global</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-radio-group
                  v-model="legacyCommands"
                  label="Gardenctl Version"
                  hint="Choose for which version the commands should be displayed on the cluster details page"
                  persistent-hint
                  class="mt-0"
                >
                  <v-radio
                    label="Gardenctl-v2"
                    :value="false"
                    color="primary"
                  ></v-radio>
                  <v-radio
                    label="Legacy Gardenctl"
                    :value="true"
                    color="primary"
                  ></v-radio>
                </v-radio-group>
              </v-col>
              <v-col cols="12">
                <legend class="text-body-2 text--secondary">Color Scheme</legend>
                <v-btn-toggle v-model="colorSchemeIndex" mandatory dense @click.native.stop class="pt-1">
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn small v-on="on">
                        <v-icon small color="primary">mdi-white-balance-sunny</v-icon>
                      </v-btn>
                    </template>
                    <span>Light Mode</span>
                  </v-tooltip>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn small v-on="on">
                        <v-icon small color="primary">mdi-weather-night</v-icon>
                      </v-btn>
                    </template>
                    <span>Dark Mode</span>
                  </v-tooltip>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn small v-on="on">
                        <v-icon small color="primary">mdi-brightness-auto</v-icon>
                      </v-btn>
                    </template>
                    <span>Automatically choose theme based on your system settings</span>
                  </v-tooltip>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <legend class="text-body-2 text--secondary">Log Level</legend>
                <v-btn-toggle lebel="Log Level" v-model="logLevelIndex" dense class="pt-1">
                  <v-btn v-for="{ value, text, icon, color } in logLevels"
                    :key="value"
                    small
                    class="text-lowercase text-caption"
                  >
                    <v-icon small class="mr-1" :color="color">{{icon}}</v-icon>
                    {{ text }}
                  </v-btn>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="autoLogin"
                  label="Automatic Login"
                  persistent-hint
                  hint="Skip the login screen if no user input is required"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'settings',
  data () {
    return {
      logLevels: [
        { value: 'debug', text: 'verbose', icon: 'mdi-bug', color: 'grey darken-4' },
        { value: 'info', text: 'info', icon: 'mdi-information', color: 'blue darken-2' },
        { value: 'warn', text: 'warning', icon: 'mdi-alert', color: 'warning' },
        { value: 'error', text: 'error', icon: 'mdi-close-circle', color: 'error' },
        { value: 'silent', text: 'silent', icon: 'mdi-pause-octagon', color: 'grey' }
      ],
      colorSchemes: ['light', 'dark', 'auto']
    }
  },
  computed: {
    ...mapGetters('storage', [
      'autoLoginEnabled',
      'logLevel',
      'colorScheme',
      'gardenctlOptions'
    ]),
    autoLogin: {
      get () {
        return this.autoLoginEnabled
      },
      set (value) {
        this.setAutoLogin(value)
      }
    },
    logLevelIndex: {
      get () {
        const index = this.logLevels.findIndex(({ value }) => value === this.logLevel)
        return index !== -1 ? index : 0
      },
      set (index) {
        const { value } = this.logLevels[index]
        this.setLogLevel(value)
      }
    },
    colorSchemeIndex: {
      get () {
        const index = this.colorSchemes.indexOf(this.colorScheme)
        return index !== -1 ? index : 2
      },
      set (index) {
        const colorScheme = this.colorSchemes[index]
        this.setColorScheme(colorScheme)
      }
    },
    legacyCommands: {
      get () {
        return this.gardenctlOptions.legacyCommands
      },
      set (value) {
        this.setGardenctlOptions({
          ...this.gardenctlOptions,
          legacyCommands: value
        })
      }
    }
  },
  methods: {
    ...mapActions('storage', [
      'setAutoLogin',
      'setLogLevel',
      'setColorScheme',
      'setGardenctlOptions'
    ])
  }
}
</script>
