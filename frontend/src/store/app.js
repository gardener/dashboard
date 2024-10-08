//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import { ref } from 'vue'
import { useNotification } from '@kyvg/vue3-notification'

import { parseWarningHeader } from '@/utils/headerWarnings'
import { errorDetailsFromError } from '@/utils/error'
import moment from '@/utils/moment'

export const useAppStore = defineStore('app', () => {
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

  function updateSplitpaneResize () {
    splitpaneResize.value = Date.now()
  }

  function setAlertWithType (type, value) {
    const alert = { type, duration: 5000 }

    if (typeof value === 'string') {
      alert.text = value
    } else if (value && typeof value === 'object') {
      const { response, text = '', ...props } = value
      Object.assign(alert, props)
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
    routerError,
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
