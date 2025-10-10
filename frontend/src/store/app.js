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

import assign from 'lodash/assign'
import pick from 'lodash/pick'

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
