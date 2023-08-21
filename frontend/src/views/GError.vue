<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-app>
    <v-main>
      <g-error
        :message="message"
        @click="goHome"
      />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAppStore } from '@/store/app'

import GError from '@/components/GError.vue'

const router = useRouter()
const store = useAppStore()

const message = computed(() => store.alert?.message)

function goHome () {
  router.push({ name: 'Home' })
}
</script>
