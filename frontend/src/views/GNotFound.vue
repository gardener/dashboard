<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <g-error
    code="404"
    text="Looks like you're lost"
    message="The page you are looking for is not available!"
    button-text="Get me out of here"
    @click="onClick"
  />
</template>

<script setup>
import { computed } from 'vue'
import {
  useRoute,
  useRouter,
} from 'vue-router'

import { useProjectStore } from '@/store/project'

import GError from '@/components/GError.vue'

const store = useProjectStore()
const route = useRoute()
const router = useRouter()

const fallbackRoute = computed(() => {
  const namespace = route.params.namespace ?? store.defaultNamespace
  const name = route.params.name
  if (namespace) {
    if (name) {
      return {
        name: 'ShootItem',
        params: {
          namespace,
          name,
        },
      }
    }
    return {
      name: 'ShootList',
      params: {
        namespace,
      },
    }
  }
  return {
    name: 'Home',
  }
})

function onClick (from) {
  if (from?.name) {
    router.push(fallbackRoute.value).catch(() => { /* ignore error */ })
  } else {
    router.back()
  }
}
</script>
