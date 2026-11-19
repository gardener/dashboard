<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-main ref="mainRef">
    <div
      ref="contentRef"
      class="g-main__content"
    >
      <g-alert-banner
        class="g-main__alert"
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
const contentRef = ref(null)
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
  const contentElement = contentRef.value
  if (contentElement && Number.isInteger(toolbarHeight)) {
    contentElement.style.height = `calc(100vh - ${toolbarHeight}px)`
  }
})

defineExpose({
  setScrollTop,
})

provide('mainContainer', wrapRef)
</script>

<style lang="scss">
.g-main__content {
    display: flex;
    flex-direction: column;
}

.g-main__content > .g-main__alert {
    flex: 0 0 auto;
}

.g-main__wrap {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100%;
}
</style>
