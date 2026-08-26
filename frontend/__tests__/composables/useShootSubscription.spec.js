//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
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

    it('retries a failed subscription close', async () => {
      setActivePinia(createPinia())
      const shootStore = useShootStore()
      const socketStore = useSocketStore()
      const emitUnsubscribe = vi.spyOn(socketStore, 'emitUnsubscribe')
        .mockRejectedValueOnce(new Error('failed to unsubscribe'))
        .mockResolvedValue()

      shootStore.state.subscription = { namespace: 'foo' }
      shootStore.state.subscriptionState = constants.OPEN
      await shootStore.closeSubscription()

      const { kind, action, retry } = useShootSubscription({ shootStore, socketStore })
      expect(kind.value).toBe('alert-subscribe')
      expect(action.value).toBe('retry')

      retry()
      await vi.waitFor(() => expect(shootStore.subscriptionState).toBe(constants.CLOSED))
      expect(emitUnsubscribe).toHaveBeenCalledTimes(3)
      expect(shootStore.subscriptionError).toBeNull()
    })
  })
})
