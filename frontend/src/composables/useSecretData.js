//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  reactive,
  computed,
  inject,
  provide,
} from 'vue'

import { decodeBase64 } from '@/utils'

import get from 'lodash/get'
import set from 'lodash/set'
import mapKeys from 'lodash/mapKeys'

export function createSecretDataComposable (keys, { keyMapping = [] } = {}) {
  const state = reactive({})
  keys.forEach(key => {
    set(state, [key])
  })

  const secretStringData = computed(() => {
    return mapKeys(state, (value, key) => get(keyMapping, [key], key))
  })

  function setSecretData (data) {
    for (const key of Object.keys(state)) {
      const secretKey = get(keyMapping, [key], key)

      const encodedValue = get(data, [secretKey])
      if (!encodedValue) {
        continue
      }

      try {
        set(state, key, decodeBase64(encodedValue))
      } catch (error) {
        set(state, key, undefined)
      }
    }
  }

  return {
    state,
    secretStringData,
    setSecretData,
  }
}

export function useSecretData () {
  return inject('secret-data', null)
}

export function useProvideSecretData (keys, options) {
  const composable = createSecretDataComposable(keys, options)
  provide('secret-data', composable)
  return composable
}
