<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <component
    :is="component"
    v-bind="componentProperties"
  />
</template>

<script>
import {
  ref,
  computed,
  toRef,
} from 'vue'
import { useRoute } from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GProjectError from '@/views/GProjectError.vue'

import { useItemPlaceholder } from '@/composables/useItemPlaceholder'

export default {
  components: {
    GProjectError,
  },
  setup () {
    const route = useRoute()
    const authzStore = useAuthzStore()
    const projectStore = useProjectStore()

    const project = toRef(projectStore, 'project')
    const namespace = toRef(projectStore, 'namespace')

    const fallbackRoute = ref(null)

    const projectItem = computed(() => namespace.value === '_all' || project.value)

    function load (route, { setError }) {
      fallbackRoute.value = null
      const routeName = route.name
      const routeParams = route.params
      if (authzStore.namespace !== routeParams.namespace) {
        setError(new Error('An unexpected error occurred'))
        fallbackRoute.value = {
          name: 'Home',
        }
      } else if (!projectStore.namespaces.includes(authzStore.namespace) && authzStore.namespace !== '_all') {
        setError(Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
          code: 404,
          reason: 'Project not found',
        }))
        fallbackRoute.value = {
          name: 'Home',
        }
      } else if (['Secrets', 'Secret'].includes(routeName) && !authzStore.canGetCloudProviderCredentials) {
        setError(Object.assign(new Error('You do not have the necessary permissions to list secrets!'), {
          code: 403,
          reason: 'Forbidden',
        }))
        fallbackRoute.value = {
          name: 'ShootList',
          params: {
            namespace: authzStore.namespace,
          },
        }
      }
    }

    const {
      component,
      componentProperties: itemPlaceholderComponentProperties,
      load: loadRoute,
    } = useItemPlaceholder({
      route,
      item: projectItem,
      load,
      errorComponent: 'g-project-error',
      loadingComponent: 'div',
      getGoneError: () => {
        fallbackRoute.value = {
          name: 'Home',
        }
        return Object.assign(new Error('The project you are looking for is no longer available'), {
          code: 410,
          reason: 'Project is gone',
        })
      },
    })

    const componentProperties = computed(() => {
      if (component.value === 'g-project-error') {
        return {
          ...itemPlaceholderComponentProperties.value,
          fallbackRoute: fallbackRoute.value,
        }
      }
      return itemPlaceholderComponentProperties.value
    })

    return {
      component,
      componentProperties,
      load: loadRoute,
    }
  },
}
</script>
