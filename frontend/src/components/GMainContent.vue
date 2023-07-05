<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-main ref="mainRef">
    <g-alert-banner
      :message="alertBannerMessage"
      :type="alertBannerType"
      :identifier="alertBannerIdentifier"
    />
    <div class="g-main__wrap" ref="wrapRef">
      <router-view :key="routerViewKey"></router-view>
    </div>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useConfigStore } from '@/store'
import { useLogger } from '@/composables'

import GAlertBanner from '@/components/GAlertBanner.vue'

const route = useRoute()
const logger = useLogger()
const configStore = useConfigStore()
const { alertBannerMessage, alertBannerType, alertBannerIdentifier } = storeToRefs(configStore)

// refs
const mainRef = ref(null)
const wrapRef = ref(null)

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

const hasTabs = computed(() => {
  const meta = route.meta ?? {}
  return !!meta.tabs
})

const mainContainer = computed(() => {
  return mainRef.value?.$el.querySelector(':scope > div[class$=\'wrap\']')
})

function setScrollTop (top = 0) {
  mainRef.value.$el.scrollTop = top
}

function setWrapElementHeight (element) {
  const mainToolbarHeight = hasTabs.value ? 112 : 64
  const wrapElement = wrapRef.value
  if (wrapElement) {
    wrapElement.style.height = `calc(100vh - ${mainToolbarHeight}px)`
  }
}

onMounted(() => {
  try {
    const mainElement = mainRef.value.$el
    setElementOverflowY(mainElement, 'hidden')
    // Find the first direct child div element of mainElement with a class attribute ending in "wrap"
    const element = mainElement.querySelector(':scope > div[class$=\'wrap\']')
    setElementOverflowY(element, 'auto')
    setWrapElementHeight()
  } catch (err) {
    logger.error(err.message)
  }
})

watch(hasTabs, value => {
  setWrapElementHeight()
})

defineExpose({
  setScrollTop,
})

provide('mainContainer', mainContainer)
</script>

<style lang="scss">
.g-main__wrap {
    flex: 1 1 auto;
    position: relative;
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100%;
}
</style>
