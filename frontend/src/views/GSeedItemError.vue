<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

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
import {
  useRoute,
  useRouter,
} from 'vue-router'

import { useProjectStore } from '@/store/project'

import GError from '@/components/GError.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

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

const seedListFallbackRoute = computed(() => {
  const namespace = route.query.namespace || projectStore.defaultNamespace
  if (namespace) {
    return {
      name: 'SeedList',
      query: {
        namespace,
      },
    }
  }
  return {
    name: 'SeedList',
  }
})

async function onClick () {
  try {
    await router.push(props.fallbackRoute ?? seedListFallbackRoute.value)
  } catch (err) {
    /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
  }
}
</script>
