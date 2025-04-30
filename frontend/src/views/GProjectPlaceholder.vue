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
  watch,
  onBeforeMount,
  onMounted,
  onBeforeUnmount,
  toRef,
} from 'vue'
import {
  useRoute,
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
} from 'vue-router'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

import GProjectError from '@/views/GProjectError.vue'

import isEqual from 'lodash/isEqual'

function isLoadRequired (route, to) {
  return route.name !== to.name || !isEqual(route.params, to.params)
}

export default {
  components: {
    GProjectError,
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      if (isLoadRequired(vm.$route, to)) {
        vm.load(to)
      }
    })
  },
  setup () {
    const route = useRoute()
    const authzStore = useAuthzStore()
    const projectStore = useProjectStore()

    const project = toRef(projectStore, 'project')
    const namespace = toRef(projectStore, 'namespace')

    const readyState = ref('initial')
    const error = ref(null)
    const fallbackRoute = ref(null)

    const component = computed(() => {
      if (error.value) {
        return 'g-project-error'
      }
      return 'router-view'
    })

    const componentProperties = computed(() => {
      switch (component.value) {
        case 'g-project-error': {
          const {
            code = 500,
            reason = 'Oops, something went wrong',
            message = 'An unexpected error occurred. Please try again later',
          } = error.value ?? {}
          return {
            code,
            text: reason,
            message,
            fallbackRoute: fallbackRoute.value,
          }
        }
        default: {
          return {}
        }
      }
    })

    function load (route) {
      error.value = null
      fallbackRoute.value = null
      readyState.value = 'loading'
      const routeName = route.name
      const routeParams = route.params
      if (authzStore.namespace !== routeParams.namespace) {
        error.value = new Error('An unexpected error occurred')
        fallbackRoute.value = {
          name: 'Home',
        }
      } else if (!projectStore.namespaces.includes(authzStore.namespace) && authzStore.namespace !== '_all') {
        error.value = Object.assign(new Error('The project you are looking for doesn\'t exist or you are not authorized to view this project!'), {
          code: 404,
          reason: 'Project not found',
        })
        fallbackRoute.value = {
          name: 'Home',
        }
      } else if (['Secrets', 'Secret'].includes(routeName) && !authzStore.canGetCloudProviderCredentials) {
        error.value = Object.assign(new Error('You do not have the necessary permissions to list secrets!'), {
          code: 403,
          reason: 'Forbidden',
        })
        fallbackRoute.value = {
          name: 'ShootList',
          params: {
            namespace: authzStore.namespace,
          },
        }
      }
    }

    onBeforeMount(() => {
      readyState.value = 'initial'
    })

    onMounted(async () => {
      await load(route)
      readyState.value = 'loaded'
    })

    onBeforeUnmount(() => {
      readyState.value = 'initial'
    })

    onBeforeRouteUpdate(async to => {
      if (isLoadRequired(route, to)) {
        await load(to)
      }
    })

    onBeforeRouteLeave(() => {
      readyState.value = 'initial'
    })

    watch(() => route.path, value => {
      if (value) {
        readyState.value = 'loaded'
      }
    })

    watch(project, value => {
      if (readyState.value === 'loaded') {
        if (!value && namespace.value !== '_all') {
          fallbackRoute.value = {
            name: 'Home',
          }
          error.value = Object.assign(new Error('The project you are looking for is no longer available'), {
            code: 410,
            reason: 'Project is gone',
          })
        } else if ([404, 410].includes(error.value?.code)) {
          fallbackRoute.value = null
          error.value = null
        }
      }
    })

    return {
      component,
      componentProperties,
    }
  },
}
</script>
