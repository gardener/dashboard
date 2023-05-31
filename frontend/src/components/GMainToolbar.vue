<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app-bar>
    <v-app-bar-nav-icon v-if="!sidebar" @click.stop="sidebar = !sidebar"></v-app-bar-nav-icon>
    <g-breadcrumb/>
    <v-spacer></v-spacer>

    <!-- connection status -->
    <div class="mr-2">
      <g-shoot-subscription-status/>
    </div>

    <!-- Help -->
    <v-btn v-if="helpMenuItems.length" color="primary" icon class="mr-4">
      <v-tooltip text="Tooltip" location="left">
        <template #activator="{ props }">
          <v-icon v-bind="props" icon="mdi-help-circle-outline"></v-icon>
        </template>
      </v-tooltip>

      <v-menu
        activator="parent"
        v-model="help"
        open-on-click
        close-on-content-click
        :offset="[12, 4]"
        transition="slide-y-transition"
      >
        <v-card rounded="0" width="300px">
          <v-card-title primary-title>
            <div class="content text-h6 mb-2">Gardener</div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn
              block
              variant="text"
              color="primary"
              title="About"
              class="justify-start"
              @click="infoDialog = true"
            >
              <v-icon color="primary" class="mr-3">mdi-information-outline</v-icon>
              About
            </v-btn>
          </v-card-actions>
          <template v-for="(item, index) in helpMenuItems" :key="index">
            <v-divider></v-divider>
            <v-card-actions class="px-3">
              <v-btn block variant="text" color="primary" class="justify-start" :href="item.url" :target="helpTarget(item)" :title="item.title">
                <v-icon color="primary" class="mr-3">{{item.icon}}</v-icon>
                {{item.title}}
                <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-menu>
    </v-btn>

    <!-- Profile badge -->
    <v-btn
      color="primary"
      icon
      class="mr-4"
    >
      <v-tooltip location="left">
        <template #activator="{ props }">
          <v-badge v-if="isAdmin"
            color="primary"
            location="bottom right"
            icon="mdi-account-supervisor"
          >
            <v-avatar v-bind="props" size="40" class="cursor-pointer">
              <v-img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`" />
            </v-avatar>
          </v-badge>
          <v-avatar v-else v-bind="props" size="40" class="cursor-pointer">
            <v-img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`" />
          </v-avatar>
        </template>
        <span v-if="isAdmin">
          {{avatarTitle}}
          <v-chip size="small" color="primary" variant="elevated">
            <v-icon start icon="mdi-account-supervisor" />
            <span class="operator">Operator</span>
          </v-chip>
        </span>
        <span v-else>{{avatarTitle}}</span>
      </v-tooltip>

      <v-menu
        activator="parent"
        open-on-click
        close-on-content-click
        :offset="[12, 4]"
        transition="slide-y-transition"
      >
        <v-sheet
          :rounded="0"
          :elevation="4"
        >
          <div class="text-center pa-3">
            <div class="text-h6">{{displayName}}</div>
            <div class="text-caption">{{username}}</div>
            <div class="text-caption" v-if="isAdmin">Operator</div>
            <v-btn-toggle
              v-model="colorMode"
              color="primary"
              mandatory="force"
              divided
              density="compact"
              @click.stop
              class="mt-3"
            >
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn value="light" v-bind="props" variant="tonal" min-width="36">
                    <v-icon icon="mdi-white-balance-sunny" />
                  </v-btn>
                </template>
                <span>Light Mode</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn value="dark" v-bind="props" variant="tonal" min-width="36">
                    <v-icon icon="mdi-weather-night" />
                  </v-btn>
                </template>
                <span>Dark Mode</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn value="auto" v-bind="props" variant="tonal" min-width="36">
                    <v-icon icon="mdi-brightness-auto" />
                  </v-btn>
                </template>
                <span>Automatically choose theme based on your system settings</span>
              </v-tooltip>
            </v-btn-toggle>
          </div>
          <v-divider/>
          <div class="pa-3">
            <v-btn
              block
              variant="text"
              color="primary"
              class="justify-start pl-4"
              prepend-icon="mdi-account-circle"
              :to="accountLink"
            >
              My Account
            </v-btn>
            <v-btn
              block
              variant="text"
              class="justify-start pl-4 mt-3"
              prepend-icon="mdi-cog"
              :to="settingsLink"
            >
              Settings
            </v-btn>
          </div>
          <v-divider/>
          <div class="pa-3">
            <v-btn
              block
              variant="text"
              color="pink"
              class="justify-start pl-4"
              prepend-icon="mdi-exit-to-app"
              @click.stop="handleLogout"
            >
              Logout
            </v-btn>
          </div>
        </v-sheet>
      </v-menu>
    </v-btn>

    <!-- terminals -->
    <template v-if="tabs && tabs.length > 1" v-slot:extension>
      <v-tabs
        color="primary"
        slider-color="secondary"
        class="tabs-bar-background"
      >
        <v-tab v-for="tab in tabs"
          :to="tab.to"
          :key="tab.key"
          :value="tab.key"
          :rounded="0"
          exact
          ripple
        >
          {{tab.title}}
        </v-tab>
      </v-tabs>
    </template>
    <g-info-dialog
      v-model="infoDialog"
      @dialog-closed="infoDialog = false"
    />
  </v-app-bar>
</template>

<script setup>
import { ref, computed, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore, useAuthnStore, useConfigStore } from '@/store'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { useTheme, useNamespace } from '@/composables'
import GShootSubscriptionStatus from './GShootSubscriptionStatus.vue'
import GBreadcrumb from './GBreadcrumb.vue'
import GInfoDialog from './dialogs/GInfoDialog.vue'

const route = useRoute()

const appStore = useAppStore()
const authnStore = useAuthnStore()
const configStore = useConfigStore()

const { colorMode } = useTheme()
const namespace = useNamespace(route)
const autoLogin = useLocalStorage('global/auto-login')

const help = ref(false)
const infoDialog = ref(false)
const sidebar = toRef(appStore, 'sidebar')
const helpMenuItems = toRef(configStore, 'helpMenuItems')
const { isAdmin, username, displayName, avatarUrl, avatarTitle } = storeToRefs(authnStore)

const tabs = computed(() => {
  const meta = route.meta ?? {}
  if (typeof meta.tabs === 'function') {
    return meta.tabs(route)
  }
  return meta.tabs
})

const accountLink = computed(() => {
  return targetRoute('Account')
})

const settingsLink = computed(() => {
  return targetRoute('Settings')
})

function targetRoute (name) {
  let query
  if (namespace.value) {
    query = { namespace: namespace.value }
  }
  return { name, query }
}

function handleLogout () {
  let err
  if (autoLogin.value === 'enabled') {
    err = new Error('NoAutoLogin')
  }
  authnStore.signout(err)
}

function helpTarget (item) {
  return item.target ?? '_blank'
}
</script>

<style lang="scss" scoped>
  @import 'vuetify/settings';

  .link-icon {
    font-size: 100%;
    padding-left: 4px;
  }

  .operator {
    color: white;
    font-weight: bold;
  }

  .tabs-bar-background {
    width: 100%;
  }

  .v-theme--light {
    &.v-app-bar {
      background-color: map-get($grey, 'lighten-4');
    }
    .tabs-bar-background {
      background-color: white !important;
    }
  }

  .v-theme--dark {
    .tabs-bar-background {
      background-color: black !important;
    }
  }
</style>
