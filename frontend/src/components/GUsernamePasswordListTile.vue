<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="showCredentials || showNotAvailablePlaceholder">
    <template v-if="showCredentials">
      <g-list-item v-if="username">
        <template v-slot:prepend>
          <v-icon color="primary" :icon="icon"></v-icon>
        </template>
        <g-list-item-content :label="usernameTitle">
          {{username}}
        </g-list-item-content>
        <template v-slot:append>
          <g-copy-btn :clipboard-text="username"/>
        </template>
      </g-list-item>
      <g-list-item v-if="email">
        <template v-slot:prepend>
          <v-icon v-if="!username" color="primary" :icon="icon"></v-icon>
        </template>
        <g-list-item-content :label="emailTitle">
          {{ email }}
        </g-list-item-content>
        <template v-slot:append>
          <g-copy-btn :clipboard-text="email"/>
        </template>
      </g-list-item>
      <g-list-item>
        <g-list-item-content :label="passwordTitle">
          {{ passwordText }}
        </g-list-item-content>
        <template v-slot:append>
          <g-copy-btn :clipboard-text="password"/>
          <g-action-button
           :icon="visibilityIcon"
           :tooltip="passwordVisibilityTitle"
            @click="showPassword = !showPassword"
          />
        </template>
      </g-list-item>
    </template>
    <g-list-item v-else-if="showNotAvailablePlaceholder">
      <template v-slot:prepend>
        <v-icon color="primary" :icon="icon"/>
      </template>
      <slot name="notAvailablePlaceholder">
        <g-list-item-content :label="Credentials">
          <v-icon color="primary" icon="mdi-alert-circle-outline" start/>
          Currently not available
        </g-list-item-content>
      </slot>
    </g-list-item>
  </div>
</template>

<script>
import GListItem from './GListItem.vue'
import GListItemContent from './GListItemContent.vue'
import GActionButton from './GActionButton.vue'
import GCopyBtn from './GCopyBtn.vue'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
  },
  props: {
    icon: {
      type: String,
      default: 'mdi-account-outline',
    },
    usernameTitle: {
      type: String,
      default: 'User',
    },
    passwordTitle: {
      type: String,
      default: 'Password',
    },
    emailTitle: {
      type: String,
      default: 'Email',
    },
    username: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    showNotAvailablePlaceholder: {
      type: Boolean,
      default: true,
    },
  },
  data () {
    return {
      showPassword: false,
    }
  },
  methods: {
    reset () {
      this.showPassword = false
    },
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
    },
  },
  watch: {
    password () {
      this.reset()
    },
  },
}
</script>
