//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  computed,
  watch,
  onBeforeMount,
  onMounted,
  onBeforeUnmount,
} from 'vue'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
} from 'vue-router'

import isEqual from 'lodash/isEqual'

export function isLoadRequired (route, to) {
  return route.name !== to.name || !isEqual(route.params, to.params)
}

export function useItemPlaceholder ({
  route,
  item,
  load,
  errorComponent,
  loadingComponent,
  getRouterViewProps,
  getGoneError,
  clearErrorCodes = [404, 410],
}) {
  const error = ref(null)
  const readyState = ref('initial')

  const component = computed(() => {
    if (error.value) {
      return errorComponent
    } else if (readyState.value === 'loading') {
      return loadingComponent
    } else if (readyState.value === 'loaded') {
      return 'router-view'
    }
    return 'div'
  })

  const componentProperties = computed(() => {
    switch (component.value) {
      case errorComponent: {
        const {
          code = 500,
          reason = 'Oops, something went wrong',
          message = 'An unexpected error occurred. Please try again later',
        } = error.value ?? {}
        return {
          code,
          text: reason,
          message,
        }
      }
      case 'router-view': {
        return getRouterViewProps?.() ?? {}
      }
      default: {
        return {}
      }
    }
  })

  async function loadRoute (to) {
    error.value = null
    readyState.value = 'loading'
    await load(to, {
      setError: value => {
        error.value = value
      },
    })
  }

  onBeforeMount(() => {
    readyState.value = 'initial'
  })

  onMounted(async () => {
    await loadRoute(route)
    readyState.value = 'loaded'
  })

  onBeforeUnmount(() => {
    readyState.value = 'initial'
  })

  onBeforeRouteUpdate(async to => {
    if (isLoadRequired(route, to)) {
      await loadRoute(to)
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

  watch(item, value => {
    if (readyState.value !== 'loaded') {
      return
    }
    if (!value) {
      error.value = getGoneError?.() ?? null
    } else if (clearErrorCodes.includes(error.value?.code)) {
      error.value = null
    }
  })

  return {
    component,
    componentProperties,
    load: loadRoute,
  }
}
