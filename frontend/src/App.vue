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
  watch,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  onKeyStroke,
  useEventBus,
  useColorMode,
  useTitle,
} from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
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
const sapTheme = useRouteQuery('sap-theme')

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

watch(sapTheme, value => {
  if (value && typeof value === 'string') {
    theme.global.name.value = colorScheme.value = value.endsWith('dark')
      ? 'dark'
      : 'light'
  }
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
    const projectNameAndTitle = projectStore.projectNameAndTitle
    const routeParamName = route.params.name
    if (routeParamName) {
      titleItems.push([projectNameAndTitle, routeParamName].join('/'))
    } else if (projectNameAndTitle) {
      titleItems.push(projectNameAndTitle)
    }
  }
  if (titleItems.length) {
    appTitle = `${titleItems.join(' • ')} | ${appTitle}`
  }

  return appTitle
})

useTitle(documentTitle)

</script>
