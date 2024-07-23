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
    <div
      ref="wrapRef"
      class="g-main__wrap"
    >
      <router-view />
    </div>
  </v-main>
</template>

<script setup>
import {
  ref,
  onMounted,
  provide,
  watchEffect,
} from 'vue'
import { useLayout } from 'vuetify'
import { storeToRefs } from 'pinia'

import { useConfigStore } from '@/store/config'

import GAlertBanner from '@/components/GAlertBanner.vue'

const { mainRect } = useLayout()
const configStore = useConfigStore()
const {
  alertBannerMessage,
  alertBannerType,
  alertBannerIdentifier,
} = storeToRefs(configStore)

// refs
const mainRef = ref(null)
const wrapRef = ref(null)

function setElementOverflowY (element, value) {
  if (element) {
    element.style.overflowY = value
  }
}

function setScrollTop (top = 0) {
  const mainElement = mainRef.value?.$el
  if (mainElement) {
    mainElement.scrollTop = top
  }
}

onMounted(() => {
  setElementOverflowY(mainRef.value?.$el, 'hidden')
  setElementOverflowY(wrapRef.value, 'auto')
})

watchEffect(() => {
  const toolbarHeight = mainRect.value?.top
  const wrapElement = wrapRef.value
  if (wrapElement && Number.isInteger(toolbarHeight)) {
    wrapElement.style.height = `calc(100vh - ${toolbarHeight}px)`
  }
})

defineExpose({
  setScrollTop,
})

provide('mainContainer', wrapRef)
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
