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
  const splitpaneLayouts = ref({})

  const fromRoute = ref(null)

  function setAlert (value) {
    alert.value = value
  }

  function setError (value) {
    setAlert({
      type: 'error',
      message: value?.message ?? '',
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
    splitpaneLayouts,
    fromRoute,
    setAlert,
    setError,
  }
})
