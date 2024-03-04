//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
} from 'vue'
import { useNotification } from '@kyvg/vue3-notification'
import LuigiClient from '@luigi-project/client'

import { useLogger } from '@/composables/useLogger'

import { parseWarningHeader } from '@/utils/headerWarnings'
import { errorDetailsFromError } from '@/utils/error'
import moment from '@/utils/moment'

import assign from 'lodash/assign'
import pick from 'lodash/pick'

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
  const { notify } = useNotification()
  const luigiContext = ref(null)

  const isInIframe = () => window.self !== window.top

  if (isInIframe()) {
    logger.debug('Registering listener for Luigi context initialization and context updates')
    LuigiClient.addInitListener(context => setLuigiContext(context))
    LuigiClient.addContextUpdateListener(context => setLuigiContext(context))
  }

  function setLuigiContext (value) {
    luigiContext.value = value
  }

  function getLuigiContext () {
    if (!isInIframe()) {
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

  function updateSplitpaneResize () {
    splitpaneResize.value = Date.now()
  }

  function setAlertWithType (type, value) {
    const alert = { type, duration: 5000 }

    if (typeof value === 'string') {
      alert.text = value
      return notify(alert)
    }

    const alertDetails = pick(value, [
      'title',
      'text',
      'name',
      'message',
      'response',
    ])

    alert.title = alertDetails.title ?? alertDetails.name ?? 'Error'
    alert.text = alertDetails.response
      ? errorDetailsFromError(value).detailedMessage
      : alertDetails.text ?? alertDetails.message ?? 'An unknown error occurred'

    const extraProps = pick(value, [
      'duration',
      'ignoreDuplicates',
      'closeOnClick',
    ])
    assign(alert, extraProps)

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
    routerError,
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
