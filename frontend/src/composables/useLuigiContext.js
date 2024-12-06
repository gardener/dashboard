//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  ref,
  toRef,
  watch,
} from 'vue'
import { createGlobalState } from '@vueuse/core'
import LuigiClient from '@luigi-project/client'

import { useLogger } from '@/composables/useLogger'
import { useIsInIframe } from '@/composables/useIsInIframe'

export const useLuigiContext = createGlobalState(() => {
  const logger = useLogger()
  const isInIframe = useIsInIframe()

  const luigiContext = ref(null)

  if (isInIframe.value) {
    logger.debug('Registering listener for Luigi context initialization and context updates')
    LuigiClient.addInitListener(context => setLuigiContext(context))
    LuigiClient.addContextUpdateListener(context => setLuigiContext(context))
  }

  function setLuigiContext (value) {
    luigiContext.value = value
  }

  const accountId = computed(() => luigiContext.value?.accountId)

  function getLuigiContext () {
    if (!isInIframe.value) {
      return Promise.resolve(null)
    }
    if (luigiContext.value !== null) {
      return Promise.resolve(luigiContext.value)
    }
    return new Promise(resolve => {
      const timeout = 3000
      const timeoutId = setTimeout(() => {
        unwatch()
        logger.error('The initialization of the Luigi Client has timed out after %d milliseconds', timeout)
        resolve(null)
      }, timeout)
      const unwatch = watch(luigiContext, context => {
        if (context !== null) {
          clearTimeout(timeoutId)
          unwatch()
          resolve(context)
        }
      }, {
        immediate: true,
      })
    })
  }

  function setRoute (route) {
    if (isInIframe.value) {
      const pathname = toRef(route, 'path')
      watch(pathname, value => {
        if (value) {
          LuigiClient.linkManager().fromVirtualTreeRoot().withoutSync().navigate(value)
        }
      }, {
        immediate: true,
      })
    }
  }

  return {
    accountId,
    luigiContext,
    setRoute,
    getLuigiContext,
  }
})
