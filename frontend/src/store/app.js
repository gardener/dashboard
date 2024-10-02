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

import { parseWarningHeader } from '@/utils/headerWarnings'
import { errorDetailsFromError } from '@/utils/error'
import moment from '@/utils/moment'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const sidebar = ref(true)
  const redirectPath = ref(null)
  const loading = ref(false)
  const defaultAlert = ref(null)
  const headerWarningAlert = ref(null)
  const location = ref(moment.tz.guess())
  const timezone = ref(moment().format('Z'))
  const focusedElementId = ref(null)
  const splitpaneResize = ref(0)
  const fromRoute = ref(null)
  const routerError = ref(null)

  function updateSplitpaneResize () {
    splitpaneResize.value = Date.now()
  }

  function setAlert (value) {
    defaultAlert.value = value
  }

  function setAlertWithType (type, value) {
    const alert = {
      type,
    }
    if (typeof value === 'string') {
      alert.message = value
    } else if (value) {
      const { message = '', title, duration } = value
      alert.message = value.response
        ? errorDetailsFromError(value).detailedMessage
        : message
      if (title) {
        alert.title = title
      }
      if (duration) {
        alert.duration = duration
      }
    } else {
      alert.message = ''
    }
    setAlert(alert)
  }

  function setError (value) {
    setAlertWithType('error', value)
  }

  function setHeaderWarning (headerWarning) {
    const parsedWarnings = parseWarningHeader(headerWarning)
    parsedWarnings.forEach((warning, index) => {
      const { text, code } = warning

      const alert = {
        group: 'headerWarning',
        type: 'warning',
        title: code === '299' ? 'Kubernetes Warning' : undefined,
        message: text,
      }

      // Defer setting the warning to ensure that watch has time to pick up the change
      setTimeout(() => {
        headerWarningAlert.value = alert
      }, 100 * index + 1)
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
    defaultAlert,
    headerWarningAlert,
    location,
    timezone,
    focusedElementId,
    splitpaneResize,
    fromRoute,
    routerError,
    updateSplitpaneResize,
    setAlert,
    setError,
    setHeaderWarning,
    setSuccess,
    setRouterError,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
