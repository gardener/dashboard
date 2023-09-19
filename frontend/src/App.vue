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
  toRef,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  onKeyStroke,
  useEventBus,
  useColorMode,
} from '@vueuse/core'

import { useConfigStore } from '@/store/config'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'

import { useCustomColors } from '@/composables/useCustomColors'

const theme = useTheme()
const localStorageStore = useLocalStorageStore()
const configStore = useConfigStore()
const loginStore = useLoginStore()

useCustomColors(() => configStore.themes ?? loginStore.themes ?? null, theme)

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
</script>
