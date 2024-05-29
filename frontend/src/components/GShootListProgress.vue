<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-progress-linear
    absolute
    :indeterminate="indeterminate"
    :color="color"
    :model-value="value"
    :striped="striped"
  />
</template>

<script setup>
import { computed } from 'vue'

import { useShootSubscription } from '@/composables/useShootSubscription'

const {
  kind,
  color,
} = useShootSubscription()

const indeterminate = computed(() => {
  return kind.value.startsWith('progress')
})
const striped = computed(() => {
  return kind.value === 'alert-connect'
})
const value = computed(() => {
  return kind.value === 'alert-connect' ? 100 : 0
})
</script>
