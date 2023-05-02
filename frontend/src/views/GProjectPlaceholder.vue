<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <component :is="componentName" v-bind="componentProperties"></component>
</template>

<script>
import { ref, computed, watch, onMounted, defineComponent } from 'vue'
import { useRoute } from 'vue-router'
import GProjectError from '@/views/GProjectError.vue'
import { useAuthzStore, useProjectStore } from '@/store'

export default defineComponent({
  components: {
    GProjectError,
  },
  setup () {
    const projectStore = useProjectStore()
    const authzStore = useAuthzStore()
    const route = useRoute()

    const componentName = ref('router-view')
    const error = ref(null)
    const fallbackRoute = ref(null)

    const componentProperties = computed(() => {
      if (componentName.value === 'g-project-error') {
        const {
          code = 500,
          reason = 'Oops, something went wrong',
          message = 'An unexpected error occurred. Please try again later',
        } = error.value
        return {
          code,
          text: reason,
          message,
          fallbackRoute: fallbackRoute.value,
        }
      }
      return {}
    })

    function load (namespace) {
      error.value = null
      fallbackRoute.value = null
      componentName.value = 'router-view'
      try {
        if (!projectStore.namespaces.includes(namespace) && namespace !== '_all') {
          fallbackRoute.value = {
            name: 'Home',
          }
          throw Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
            code: 404,
            reason: 'Project not found',
          })
        }
        if (['Secrets', 'Secret'].includes(route.name) && !authzStore.canGetSecrets) {
          fallbackRoute.value = {
            name: 'ShootList',
            params: {
              namespace,
            },
          }
          throw Object.assign(new Error('You do not have the necessary permissions to list secrets!'), {
            code: 403,
            reason: 'Forbidden',
          })
        }
      } catch (err) {
        error.value = err
        componentName.value = 'g-project-error'
      }
    }

    watch(() => route.params.namespace, value => {
      load(value)
    })

    onMounted(() => {
      load(route.params.namespace)
    })

    return {
      componentName,
      componentProperties,
    }
  },
})
</script >
