//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createGlobalState } from '@vueuse/core'
import { useAuthn } from '@/composables'
import { createAbortError } from '@/utils/errors'

import api from './api'
import { registry } from './fetch'

export const useApi = createGlobalState(() => {
  const auth = useAuthn()

  registry.register({
    async requestFulfilled (...args) {
      const url = args[0] ?? ''
      if (url.startsWith('/api')) {
        try {
          await auth.ensureValidToken()
        } catch (err) {
          throw createAbortError('Request aborted')
        }
      }
      return args
    },
  })

  return api
})
