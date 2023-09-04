//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref } from 'vue'

import moment from '@/utils/moment'
import { errorDetailsFromError } from '@/utils/error'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const sidebar = ref(true)
  const redirectPath = ref(null)
  const loading = ref(false)
  const alert = ref(null)
  const location = ref(moment.tz.guess())
  const timezone = ref(moment().format('Z'))
  const focusedElementId = ref(null)
  const splitpaneResize = ref(null)
  const fromRoute = ref(null)
  const routerError = ref(null)

  function updateSplitpaneResize () {
    splitpaneResize.value = new Date()
  }

  function setAlert (value) {
    alert.value = value
  }

  function setAlertWithType (type, value) {
    const alert = {
      type,
    }
    if (typeof value === 'string') {
      alert.message = value
    } else if (value) {
      const { message = '', title } = value
      alert.message = value.response
        ? errorDetailsFromError(value).detailedMessage
        : message
      if (title) {
        alert.title = title
      }
    } else {
      alert.message = ''
    }
    setAlert(alert)
  }

  function setError (value) {
    setAlertWithType('error', value)
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
    alert,
    location,
    timezone,
    focusedElementId,
    splitpaneResize,
    fromRoute,
    routerError,
    updateSplitpaneResize,
    setAlert,
    setError,
    setSuccess,
    setRouterError,
  }
})
