<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-main ref="main">
    <g-alert
      :message="alertBannerMessage"
      :type="alertBannerType"
      :identifier="alertBannerIdentifier"
    >
    </g-alert>
    <router-view :key="routerViewKey"></router-view>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store'
import { useLogger } from '@/composables'

import GAlert from '@/components/GAlert.vue'

const route = useRoute()
const logger = useLogger()
const store = useAppStore()
const { alertBannerMessage, alertBannerType, alertBannerIdentifier } = storeToRefs(store)

// refs
const main = ref(null)

function setElementOverflowY (element, value) {
  if (element) {
    element.style.overflowY = value
  }
}

const routerViewKey = computed(() => {
  if (route.name !== 'ShootItemTerminal') {
    return undefined
  }
  return route.path
})

function setScrollTop (top = 0) {
  main.value.$el.scrollTop = top
}

onMounted(() => {
  try {
    const mainElement = main.value.$el
    setElementOverflowY(mainElement, 'hidden')
    // Find the first direct child div element of mainElement with a class attribute ending in "wrap"
    const element = mainElement.querySelector(':scope > div[class$="wrap"]')
    setElementOverflowY(element, 'auto')
  } catch (err) {
    logger.error(err.message)
  }
})

defineExpose({
  setScrollTop,
})
</script>
