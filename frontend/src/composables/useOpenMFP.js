//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useRoute } from 'vue-router'
import {
  until,
  createGlobalState,
} from '@vueuse/core'
import LuigiClient from '@luigi-project/client'
import {
  computed,
  ref,
  toRef,
  watch,
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useIsInIframe } from '@/composables/useIsInIframe'

export const useOpenMFP = createGlobalState((options = {}) => {
  const {
    logger = useLogger(),
    isInIframe = useIsInIframe(),
    route = useRoute(),
  } = options

  const luigiContext = ref(null)

  if (isInIframe.value) {
    logger.debug('Registering listener for Luigi context initialization and context updates')
    LuigiClient.addInitListener(context => setLuigiContext(context))
    LuigiClient.addContextUpdateListener(context => setLuigiContext(context))
    const pathname = toRef(route, 'path')
    watch(pathname, value => {
      if (value) {
        LuigiClient.linkManager().fromVirtualTreeRoot().withoutSync().navigate(value)
      }
    }, {
      immediate: true,
    })
  }

  function setLuigiContext (value) {
    luigiContext.value = value
  }

  const accountId = computed(() => luigiContext.value?.accountId)

  async function getLuigiContext () {
    if (!isInIframe.value) {
      return null
    }
    if (luigiContext.value !== null) {
      return luigiContext.value
    }
    const timeout = 3000
    try {
      await until(luigiContext).toBeTruthy({
        timeout: 1000,
        throwOnTimeout: true,
      })
      return luigiContext.value
    } catch (err) {
      logger.error('The initialization of the Luigi Client has timed out after %d milliseconds', timeout)
      return null
    }
  }

  return {
    accountId,
    luigiContext,
    getLuigiContext,
  }
})
