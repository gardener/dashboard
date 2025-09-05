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
  computed,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  onKeyStroke,
  useEventBus,
  useColorMode,
  useTitle,
} from '@vueuse/core'
import { useRoute } from 'vue-router'

import { useConfigStore } from '@/store/config'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'
import { useProjectStore } from '@/store/project'

import { useCustomColors } from '@/composables/useCustomColors'

import get from 'lodash/get'

const theme = useTheme()
const route = useRoute()
const localStorageStore = useLocalStorageStore()
const configStore = useConfigStore()
const loginStore = useLoginStore()
const projectStore = useProjectStore()
const logger = inject('logger')

async function setCustomColors () {
  try {
    await useCustomColors(() => configStore.themes ?? loginStore.themes ?? null, theme)
  } catch (err) {
    logger.error(err.message)
  }
}
setCustomColors()

const colorScheme = toRef(localStorageStore, 'colorScheme')
const { system } = useColorMode({
  storageRef: colorScheme,
  onChanged (value) {
    const themeValue = value === 'auto'
      ? system.value
      : value
    theme.change(themeValue)
  },
})

provide('getColorCode', value => {
  return get(theme.current.value, ['colors', value])
})

const bus = useEventBus('esc-pressed')

onKeyStroke('Escape', e => {
  bus.emit()
  e.preventDefault()
})

const documentTitle = computed(() => {
  let appTitle = process.env.VITE_APP_TITLE
  const branding = configStore.branding ?? loginStore.branding
  if (branding.productTitle) {
    appTitle = branding.documentTitle ?? `${branding.productName} Dashboard`
  }

  const titleItems = []

  const pageTitle = route.meta.title ?? route.name
  if (pageTitle) {
    titleItems.push(pageTitle)
  }

  if (route.meta.namespaced !== false) {
    const projectName = projectStore.projectName
    const routeParamName = route.params.name
    if (routeParamName) {
      titleItems.push([projectName, routeParamName].join('/'))
    } else if (projectName) {
      titleItems.push(projectName)
    }
  }
  if (titleItems.length) {
    appTitle = `${titleItems.join(' • ')} | ${appTitle}`
  }

  return appTitle
})

useTitle(documentTitle)

</script>
