<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <router-view />
</template>

<script setup>
import {
  computed,
  watch,
  onBeforeMount,
} from 'vue'
import { useRoute } from 'vue-router'

import { useProvideShootContext } from '@/composables/useShootContext'

const route = useRoute()
const { createShootManifest } = useProvideShootContext()

const projectName = computed(() => route.params?.projectName)

onBeforeMount(() => createShootManifest())

watch(projectName, () => createShootManifest())
</script>
