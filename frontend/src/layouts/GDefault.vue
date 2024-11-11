<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app ref="app">
    <v-main v-if="hasRouterError">
      <g-error
        :code="routerErrorCode"
        :text="routerErrorText"
        :message="routerErrorMessage"
        :button-text="buttonText"
        @click="onClick"
      />
    </v-main>
    <template v-else>
      <g-loading />
      <g-main-navigation />
      <g-main-toolbar />
      <g-main-content ref="mainContent" />
      <g-notify />
    </template>
  </v-app>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
} from 'vue'
import { onBeforeRouteUpdate } from 'vue-router'

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'

import GError from '@/components/GError.vue'
import GLoading from '@/components/GLoading.vue'
import GMainNavigation from '@/components/GMainNavigation.vue'
import GMainToolbar from '@/components/GMainToolbar.vue'
import GMainContent from '@/components/GMainContent.vue'
import GNotify from '@/components/GNotify.vue'

import { useLogger } from '@/composables/useLogger'

import get from 'lodash/get'

const logger = useLogger()
const appStore = useAppStore()
const authnStore = useAuthnStore()

// refs
const app = ref(null)
const mainContent = ref(null)

// computed
const hasRouterError = computed(() => {
  return !!appStore.routerError
})

const routerErrorCode = computed(() => {
  const err = appStore.routerError
  return get(err, ['response', 'data', 'code'], get(err, ['status'], 500))
})

const routerErrorText = computed(() => {
  const err = appStore.routerError
  return get(err, ['response', 'data', 'reason'], get(err, ['reason'], 'Unexpected error :('))
})

const routerErrorMessage = computed(() => {
  const err = appStore.routerError
  return get(err, ['response', 'data', 'message'], get(err, ['message']))
})

const buttonText = computed(() => {
  return routerErrorCode.value === 401
    ? 'Reset Session'
    : 'Reload this page'
})

// methods
function setElementOverflowY (element, value) {
  if (element) {
    element.style.overflowY = value
  }
}

function onClick () {
  if (routerErrorCode.value === 401) {
    authnStore.signout()
  } else {
    window.location.reload()
  }
}

// hooks
onBeforeRouteUpdate((to, from, next) => {
  mainContent.value?.setScrollTop(0)
  next()
})

onMounted(() => {
  try {
    const appElement = app.value.$el
    setElementOverflowY(appElement, 'hidden')
    // Find the first direct child div element of appElement with a class attribute ending in "wrap"
    const element = appElement.querySelector(':scope > div[class$="wrap"]')
    setElementOverflowY(element, 'hidden')
  } catch (err) {
    logger.error(err.message)
  }
})
</script>
