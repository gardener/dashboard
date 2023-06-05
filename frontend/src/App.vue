<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <router-view />
</template>

<script setup>
import { provide } from 'vue'
import { useTheme } from 'vuetify'
import { onKeyStroke, useEventBus, useColorMode } from '@vueuse/core'

const theme = useTheme()
const colorMode = useColorMode({
  storageKey: 'global/color-scheme',
  onChanged (mode) {
    theme.global.name.value = mode === 'auto'
      ? colorMode.system.value
      : mode
  },
})
provide('colorMode', colorMode.store)
provide('getColorCode', value => theme.current.value?.colors[value])

const bus = useEventBus('esc-pressed')

onKeyStroke('Escape', e => {
  bus.emit()
  e.preventDefault()
})
</script>
