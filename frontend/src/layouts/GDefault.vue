<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app ref="app">
    <g-loading />
    <g-main-navigation />
    <g-main-toolbar />
    <g-main-content ref="mainContent"/>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onBeforeRouteUpdate } from 'vue-router'
import { useLogger } from '@/composables'
import GLoading from '@/components/GLoading.vue'
import GMainNavigation from '@/components/GMainNavigation.vue'
import GMainToolbar from '@/components/GMainToolbar.vue'
import GMainContent from '@/components/GMainContent.vue'

const logger = useLogger()

// refs
const app = ref(null)
const mainContent = ref(null)

// methods
function setElementOverflowY (element, value) {
  if (element) {
    element.style.overflowY = value
  }
}

// hooks
onBeforeRouteUpdate((to, from, next) => {
  mainContent.value.setScrollTop(0)
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
