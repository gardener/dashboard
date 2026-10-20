<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

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
  const projectName = route.params.projectName ?? store.projectNameByNamespace(store.defaultNamespace)
  const name = route.params.name
  if (projectName) {
    if (name) {
      return {
        name: 'ShootItem',
        params: {
          projectName,
          name,
        },
      }
    }
    return {
      name: 'ShootList',
      params: {
        projectName,
      },
    }
  }
  return {
    name: 'ProjectList',
  }
})

function onClick (from) {
  if (from?.name) {
    return router.push(fallbackRoute.value)
  } else {
    router.back()
  }
}
</script>
