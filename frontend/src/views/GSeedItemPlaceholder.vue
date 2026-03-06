<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="component"
    v-bind="componentProperties"
  />
</template>

<script setup>
import {
  ref,
  computed,
  provide,
} from 'vue'
import { useRoute } from 'vue-router'

import { useSeedStore } from '@/store/seed'

import GSeedItemLoading from '@/views/GSeedItemLoading.vue'
import GSeedItemError from '@/views/GSeedItemError.vue'

import { useProvideSeedItem } from '@/composables/useSeedItem/index'
import { useItemPlaceholder } from '@/composables/useItemPlaceholder'

defineOptions({
  components: {
    GSeedItemLoading,
    GSeedItemError,
  },
})

const route = useRoute()
const seedStore = useSeedStore()

const activePopoverKey = ref('')

const seedItem = computed(() => seedStore.seedByName(route.params.name))

async function load (to, { setError }) {
  try {
    if (!seedStore.seedByName(to.params.name)) {
      setError(Object.assign(new Error('The seed you are looking for doesn\'t exist'), {
        code: 404,
        reason: 'Seed not found',
      }))
    }
  } catch (err) {
    let {
      statusCode,
      code = statusCode,
      reason,
      message,
    } = err
    if (code === 404) {
      reason = 'Seed not found'
      message = 'The seed you are looking for doesn\'t exist'
    } else if (code >= 500) {
      reason = 'Oops, something went wrong'
      message = 'An unexpected error occurred. Please try again later'
    }
    setError(Object.assign(new Error(message), {
      code,
      reason,
    }))
  }
}

const {
  component,
  componentProperties,
} = useItemPlaceholder({
  route,
  item: seedItem,
  load,
  errorComponent: 'g-seed-item-error',
  loadingComponent: 'g-seed-item-loading',
  getGoneError: () => Object.assign(new Error('The seed you are looking for is no longer available'), {
    code: 410,
    reason: 'Seed is gone',
  }),
})

provide('activePopoverKey', activePopoverKey)
useProvideSeedItem(seedItem)
</script>
