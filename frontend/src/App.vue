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
  computed,
} from 'vue'
import { useTheme } from 'vuetify'
import {
  onKeyStroke,
  useEventBus,
  useColorMode,
  useDocumentVisibility,
  useTitle,
} from '@vueuse/core'
import { useRoute } from 'vue-router'

import { useConfigStore } from '@/store/config'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'
import { useShootStore } from '@/store/shoot'
import { useProjectStore } from '@/store/project'

import { useCustomColors } from '@/composables/useCustomColors'

const theme = useTheme()
const route = useRoute()
const localStorageStore = useLocalStorageStore()
const visibility = useDocumentVisibility()
const configStore = useConfigStore()
const loginStore = useLoginStore()
const shootStore = useShootStore()
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

const documentTitle = computed(() => {
  let appTitle = process.env.VITE_APP_TITLE
  const branding = configStore.branding ?? loginStore.branding
  if (branding.productTitle) {
    appTitle = branding.documentTitle ?? `${branding.productName} Dashboard`
  }

  const projectName = projectStore.projectName
  const routeParamName = route.params.name
  const pageTitle = route.meta.title ?? route.name

  let titleItems = [pageTitle]
  if (route.meta.namespaced !== false) {
    const locationTitle = [projectName, routeParamName].filter(item => item !== undefined).join('/')
    titleItems.push(locationTitle)
  }
  titleItems = titleItems.filter(item => item?.length)

  if (titleItems.length) {
    appTitle = `${titleItems.join(' • ')} | ${appTitle}`
  }

  return appTitle
})

useTitle(documentTitle)

</script>
