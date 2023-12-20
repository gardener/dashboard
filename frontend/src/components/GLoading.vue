<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-overlay
    :model-value="loading"
    :close-on-back="false"
    class="align-center justify-center"
  >
    <v-progress-circular
      indeterminate
      size="64"
    />
  </v-overlay>
</template>

<script setup>
import { toRef } from 'vue'

import { useAppStore } from '@/store/app'

const store = useAppStore()

const loading = toRef(store, 'loading')
</script>
