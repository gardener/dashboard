//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref } from 'vue'
import moment from '@/utils/moment'

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

  function updateSplitpaneResize () {
    splitpaneResize.value = new Date()
  }

  function setAlert (value) {
    alert.value = value
  }

  function setSuccess (value) {
    const message = typeof value === 'string'
      ? value
      : value?.message ?? ''
    setAlert({
      type: 'success',
      message,
    })
  }

  function setError (value) {
    const message = typeof value === 'string'
      ? value
      : value?.message ?? ''
    setAlert({
      type: 'error',
      message,
    })
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
    updateSplitpaneResize,
    setAlert,
    setError,
    setSuccess,
  }
})
