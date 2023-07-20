//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref, watch } from 'vue'
import pTimeout from 'p-timeout'
import { useLogger } from '@/composables/useLogger'

export const useAsyncRef = (key, options = {}) => {
  const {
    logger = useLogger(),
  } = options
  let keyRefPromise

  const keyRef = ref(null)

  const fulfiller = {
    resolve: () => {},
  }

  const init = () => {
    keyRefPromise = new Promise(resolve => {
      fulfiller.resolve = resolve
    })
  }

  init()

  watch(keyRef, value => {
    if (value) {
      fulfiller.resolve(value)
      fulfiller.resolve = () => {}
    } else {
      init()
    }
  })

  return {
    [key + 'Ref']: keyRef,
    [key]: {
      vm: ({ timeout = 3000 } = {}) => {
        return pTimeout(keyRefPromise, { milliseconds: timeout }, `async reference ${key} timed out`)
      },
      async dispatch (obj, ...args) {
        const { method, ...options } = typeof obj === 'string'
          ? { method: obj }
          : obj
        try {
          return (await this.vm(options))[method](...args)
        } catch (err) {
          logger.error(err.message)
        }
      },
      async get (name, options) {
        try {
          return (await this.vm(options))[name]
        } catch (err) {
          logger.error(err.message)
        }
      },
    },
  }
}
