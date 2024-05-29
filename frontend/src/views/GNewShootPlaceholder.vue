<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

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

const namespace = computed(() => route.params?.namespace)

onBeforeMount(() => createShootManifest())

watch(namespace, () => createShootManifest())
</script>
