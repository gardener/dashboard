<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="showCredentials || showNotAvailablePlaceholder">
    <template v-if="showCredentials">
      <v-list-item v-if="username">
        <v-list-item-icon>
          <v-icon color="primary">{{icon}}</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>{{usernameTitle}}</v-list-item-subtitle>
          <v-list-item-title class="pt-1">{{username}}</v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <copy-btn :clipboard-text="username"></copy-btn>
        </v-list-item-action>
      </v-list-item>
      <v-list-item v-if="email">
        <v-list-item-icon>
          <v-icon v-if="!username" color="primary">{{icon}}</v-icon>
        </v-list-item-icon>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>{{emailTitle}}</v-list-item-subtitle>
          <v-list-item-title class="pt-1">{{email}}</v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <copy-btn :clipboard-text="email"></copy-btn>
        </v-list-item-action>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>{{passwordTitle}}</v-list-item-subtitle>
          <v-list-item-title class="pt-1">{{passwordText}}</v-list-item-title>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <copy-btn :clipboard-text="password"></copy-btn>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.stop="showPassword = !showPassword" color="action-button">
                <v-icon>{{visibilityIcon}}</v-icon>
              </v-btn>
            </template>
            <span>{{passwordVisibilityTitle}}</span>
          </v-tooltip>
        </v-list-item-action>
      </v-list-item>
    </template>
    <v-list-item v-else-if="showNotAvailablePlaceholder">
      <v-list-item-icon>
        <v-icon color="primary">{{icon}}</v-icon>
      </v-list-item-icon>
      <slot name="notAvailablePlaceholder">
        <v-list-item-content>
          <v-list-item-subtitle>Credentials</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <v-icon color="primary">mdi-alert-circle-outline</v-icon>
            Currently not available
          </v-list-item-title>
        </v-list-item-content>
      </slot>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn.vue'

export default {
  components: {
    CopyBtn
  },
  props: {
    icon: {
      type: String,
      default: 'mdi-account-outline'
    },
    usernameTitle: {
      type: String,
      default: 'User'
    },
    passwordTitle: {
      type: String,
      default: 'Password'
    },
    emailTitle: {
      type: String,
      default: 'Email'
    },
    username: {
      type: String
    },
    email: {
      type: String
    },
    password: {
      type: String
    },
    showNotAvailablePlaceholder: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      showPassword: false
    }
  },
  methods: {
    reset () {
      this.showPassword = false
    }
  },
  computed: {
    passwordText () {
      return this.showPassword ? this.password : '****************'
    },
    passwordVisibilityTitle () {
      return this.showPassword ? 'Hide password' : 'Show password'
    },
    visibilityIcon () {
      return this.showPassword ? 'mdi-eye-off' : 'mdi-eye'
    },
    showCredentials () {
      return (!!this.username || !!this.email) && !!this.password
    }
  },
  watch: {
    password (value) {
      this.reset()
    }
  }
}
</script>
