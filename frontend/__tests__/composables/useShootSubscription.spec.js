//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useShootStore } from '@/store/shoot'
import { useSocketStore } from '@/store/socket'
import { constants } from '@/store/shoot/helper'

import { useShootSubscription } from '@/composables/useShootSubscription'

describe('composables', () => {
  describe('useShootSubscription', () => {
    it('indicates subscription progress while the previous subscription is closing', () => {
      setActivePinia(createPinia())
      const shootStore = useShootStore()
      const socketStore = useSocketStore()
      const {
        kind,
        message,
      } = useShootSubscription({
        shootStore,
        socketStore,
      })

      shootStore.state.subscriptionState = constants.CLOSING

      expect(kind.value).toBe('progress-subscribe')
      expect(message.value).toBe('Subscribing shoots ...')
    })
  })
})
