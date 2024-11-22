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

import get from 'lodash/get'
import set from 'lodash/set'
import mapKeys from 'lodash/mapKeys'

export function createSecretDialogDataComposable (options) {
  const { data, keyMapping } = options
  const state = reactive(data)

  const secretData = computed(() => {
    return mapKeys(state, (value, key) => get(keyMapping, [key], key))
  })

  function updateWithSecret (secret) {
    for (const key of Object.keys(state)) {
      const secretKey = get(keyMapping, [key], key)

      const encodedValue = get(secret, ['data', secretKey])
      if (!encodedValue) {
        continue
      }

      try {
        set(state, key, atob(encodedValue))
      } catch (error) {
        set(state, key, undefined)
      }
    }
  }

  return {
    secretData,
    updateWithSecret,
  }
}

export function useSecretDialogData () {
  return inject('secret-dialog-data', null)
}

export function useProvideSecretDialogData (options) {
  const composable = createSecretDialogDataComposable(options)
  provide('secret-dialog-data', composable)
  return composable
}
