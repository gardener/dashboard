<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-error
    :code="code"
    :text="text"
    :message="message"
    :button-text="buttonText"
    @click="onClick"
  />
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'
import { useRouter } from 'vue-router'

import GError from '@/components/GError.vue'

const router = useRouter()

const props = defineProps({
  code: {
    type: [String, Number],
    default: '404',
  },
  text: {
    type: String,
    default: 'Seed not found',
  },
  message: {
    type: String,
    default: 'The seed you are looking for doesn\'t exist',
  },
  buttonText: {
    type: String,
    default: 'Back to seed list',
  },
  fallbackRoute: {
    type: Object,
    default: null,
  },
})

const {
  code,
  text,
  message,
  buttonText,
} = toRefs(props)

const seedListFallbackRoute = computed(() => ({ name: 'SeedList' }))

async function onClick () {
  await router.push(props.fallbackRoute ?? seedListFallbackRoute.value)
}
</script>
