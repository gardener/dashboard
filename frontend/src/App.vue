<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <router-view />
</template>

<script setup>
import {
  provide,
  inject,
  toRef,
  watch,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  onKeyStroke,
  useEventBus,
  useColorMode,
  useDocumentVisibility,
} from '@vueuse/core'

import { useConfigStore } from '@/store/config'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'
import { useShootStore } from '@/store/shoot'

import { useCustomColors } from '@/composables/useCustomColors'

const theme = useTheme()
const localStorageStore = useLocalStorageStore()
const visibility = useDocumentVisibility()
const configStore = useConfigStore()
const loginStore = useLoginStore()
const shootStore = useShootStore()
const logger = inject('logger')

async function setCustomColors () {
  try {
    await useCustomColors(() => configStore.themes ?? loginStore.themes ?? null, theme)
  } catch (err) {
    logger.error(err.message)
  }
}
setCustomColors()

watch(() => configStore.branding ?? loginStore.branding, branding => {
  if (branding.productTitle) {
    document.title = branding.documentTitle ?? `${branding.productName} Dashboard`
  }
})

const colorScheme = toRef(localStorageStore, 'colorScheme')
const { system } = useColorMode({
  storageRef: colorScheme,
  onChanged (value) {
    theme.global.name.value = value === 'auto'
      ? system.value
      : value
  },
})

provide('getColorCode', value => theme.current.value?.colors[value])

const bus = useEventBus('esc-pressed')

onKeyStroke('Escape', e => {
  bus.emit()
  e.preventDefault()
})

watch(visibility, (current, previous) => {
  if (current === 'visible' && previous === 'hidden') {
    shootStore.invokeSubscriptionEventHandler()
  }
})
</script>
