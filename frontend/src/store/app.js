//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  watch,
  toRef,
  computed,
} from 'vue'
import LuigiClient from '@luigi-project/client'
import { useNotification } from '@kyvg/vue3-notification'

import { useLogger } from '@/composables/useLogger'

import { parseWarningHeader } from '@/utils/headerWarnings'
import { errorDetailsFromError } from '@/utils/error'
import moment from '@/utils/moment'

import assign from 'lodash/assign'

export const useAppStore = defineStore('app', () => {
  const logger = useLogger()

  const ready = ref(false)
  const sidebar = ref(true)
  const redirectPath = ref(null)
  const loading = ref(false)
  const location = ref(moment.tz.guess())
  const timezone = ref(moment().format('Z'))
  const focusedElementId = ref(null)
  const splitpaneResize = ref(0)
  const fromRoute = ref(null)
  const routerError = ref(null)
  const luigiContext = ref(null)

  const { notify } = useNotification()

  const isInIframe = computed(() => window.self !== window.top)

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

  function updateSplitpaneResize () {
    splitpaneResize.value = Date.now()
  }

  function setAlertWithType (type, value) {
    const alert = { type, duration: 5000 }

    if (typeof value === 'string') {
      alert.text = value
    } else if (value && typeof value === 'object') {
      const { response, text = '', ...props } = value
      assign(alert, props)
      alert.text = response
        ? errorDetailsFromError(value).detailedMessage
        : text
    }

    notify(alert)
  }

  function setError (value) {
    setAlertWithType('error', value)
  }

  function setHeaderWarning (headerWarning) {
    const parsedWarnings = parseWarningHeader(headerWarning)
    parsedWarnings.forEach(warning => {
      const { text, code } = warning
      setAlertWithType('warning', {
        title: code === '299' ? 'Kubernetes Warning' : undefined,
        text,
        duration: -1,
      })
    })
  }

  function setSuccess (value) {
    setAlertWithType('success', value)
  }

  function setRouterError (value) {
    routerError.value = value
  }

  return {
    ready,
    sidebar,
    redirectPath,
    loading,
    location,
    timezone,
    focusedElementId,
    splitpaneResize,
    fromRoute,
    isInIframe,
    setRoute,
    routerError,
    accountId,
    luigiContext,
    getLuigiContext,
    updateSplitpaneResize,
    setError,
    setHeaderWarning,
    setSuccess,
    setRouterError,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
