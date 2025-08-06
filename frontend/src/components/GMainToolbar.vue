<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app-bar>
    <v-app-bar-nav-icon
      v-if="!sidebar"
      @click.stop="sidebar = !sidebar"
    />
    <g-breadcrumb />
    <v-spacer />

    <!-- connection status -->
    <div class="mr-2">
      <g-shoot-subscription-status />
    </div>

    <!-- Help -->
    <v-btn
      v-if="helpMenuItems.length"
      v-tooltip:left="{
        text: 'Info',
        disabled: help
      }"
      color="primary"
      icon
      class="mr-5"
    >
      <v-icon icon="mdi-help-circle-outline" />

      <v-menu
        v-model="help"
        activator="parent"
        open-on-click
        close-on-content-click
        :offset="[12, 4]"
        transition="slide-y-transition"
      >
        <v-card
          rounded="0"
          width="300px"
        >
          <v-card-title primary-title>
            <div class="content text-h6 mb-2">
              {{ branding.productName }}
            </div>
          </v-card-title>
          <v-divider />
          <v-card-actions class="px-3">
            <v-btn
              block
              variant="text"
              color="primary"
              title="About"
              class="justify-start"
              @click="infoDialog = true"
            >
              <v-icon
                color="primary"
                class="mr-3"
              >
                mdi-information-outline
              </v-icon>
              About
            </v-btn>
          </v-card-actions>
          <template
            v-for="(item, index) in helpMenuItems"
            :key="index"
          >
            <v-divider />
            <v-card-actions class="px-3">
              <v-btn
                block
                variant="text"
                color="primary"
                class="justify-start"
                :href="item.url"
                :target="helpTarget(item)"
                :title="item.title"
              >
                <v-icon
                  color="primary"
                  class="mr-3"
                >
                  {{ item.icon }}
                </v-icon>
                {{ item.title }}
                <v-icon
                  color="primary"
                  class="link-icon"
                >
                  mdi-open-in-new
                </v-icon>
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
      class="mr-3"
    >
      <v-tooltip
        :disabled="menu"
        location="left"
      >
        <template #activator="{ props }">
          <v-badge
            v-if="isAdmin"
            color="primary"
            location="bottom right"
            icon="mdi-account-supervisor"
          >
            <v-avatar
              v-bind="props"
              size="40"
              class="cursor-pointer"
            >
              <v-img
                :src="avatarUrl"
                :alt="`avatar of ${avatarTitle}`"
              />
            </v-avatar>
          </v-badge>
          <v-avatar
            v-else
            v-bind="props"
            size="40"
            class="cursor-pointer"
          >
            <v-img
              :src="avatarUrl"
              :alt="`avatar of ${avatarTitle}`"
            />
          </v-avatar>
        </template>
        <span v-if="isAdmin">
          {{ avatarTitle }}
          <v-chip
            size="small"
            color="primary"
            variant="elevated"
          >
            <v-icon
              start
              icon="mdi-account-supervisor"
            />
            <span class="operator">Operator</span>
          </v-chip>
        </span>
        <span v-else>{{ avatarTitle }}</span>
      </v-tooltip>

      <v-menu
        v-model="menu"
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
            <div class="text-h6">
              {{ displayName }}
            </div>
            <div class="text-caption">
              {{ username }}
            </div>
            <div
              v-if="isAdmin"
              class="text-caption"
            >
              Operator
            </div>
            <v-btn-toggle
              v-model="colorMode"
              color="primary"
              mandatory="force"
              divided
              density="compact"
              class="mt-3"
              @click.stop
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
          </div>
          <v-divider />
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
          <v-divider />
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
    <template
      v-if="tabs && tabs.length > 1"
      #extension
    >
      <v-tabs
        v-model="routeMetaTabKey"
        color="primary"
        slider-color="secondary"
        class="tabs-bar-background"
      >
        <v-tab
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.to"
          :value="tab.key"
          :rounded="0"
          exact
          ripple
        >
          {{ tab.title }}
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
import {
  ref,
  computed,
  toRef,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import GBreadcrumb from '@/components/GBreadcrumb.vue'
import GInfoDialog from '@/components/dialogs/GInfoDialog.vue'

import { useNamespace } from '@/composables/useNamespace'

import GShootSubscriptionStatus from './GShootSubscriptionStatus.vue'

import get from 'lodash/get'

const route = useRoute()

const appStore = useAppStore()
const authnStore = useAuthnStore()
const configStore = useConfigStore()
const localStorageStore = useLocalStorageStore()

const namespace = useNamespace(route)

const help = ref(false)
const menu = ref(false)
const tabKey = ref(get(route, ['meta', 'tabKey']))
const infoDialog = ref(false)
const sidebar = toRef(appStore, 'sidebar')
const helpMenuItems = toRef(configStore, 'helpMenuItems')
const branding = toRef(configStore, 'branding')
const autoLogin = toRef(localStorageStore, 'autoLogin')
const colorMode = toRef(localStorageStore, 'colorScheme')

const { isAdmin, username, displayName, avatarUrl, avatarTitle } = storeToRefs(authnStore)

const tabs = computed(() => {
  const meta = route.meta ?? {}
  if (typeof meta.tabs === 'function') {
    return meta.tabs(route)
  }
  return meta.tabs
})

const routeMetaTabKey = computed({
  get () {
    return get(route, ['meta', 'tabKey'], tabKey.value)
  },
  set (value) {
    tabKey.value = value
  },
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
  if (autoLogin.value) {
    err = new Error('NoAutoLogin')
  }
  authnStore.signout(err, '')
}

function helpTarget (item) {
  return item.target ?? '_blank'
}
</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

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
      background-color: map.get(vuetify.$grey, 'lighten-4');
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
