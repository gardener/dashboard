//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables/useLogger'

import isEqual from 'lodash/isEqual'

export function createSynchronizeLock (storeName) {
  const logger = useLogger()
  return {
    expiresAt: 0,
    options: null,
    acquire (options) {
      if (isEqual(this.options, options) && this.expiresAt > Date.now()) {
        logger.warn('Detected concurrent synchronization attempts for the same %s subscription', storeName)
        return false
      }
      this.expiresAt = Date.now() + 30_000
      this.options = { ...options }
      return true
    },
    release () {
      this.expiresAt = 0
      this.options = null
    },
  }
}
