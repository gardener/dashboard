//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'
import { flushPromises } from '@vue/test-utils'

import { useSeedStatStore } from '@/store/seedStat'
import { useSocketStore } from '@/store/socket'

import { useApi } from '@/composables/useApi'
import { getUnhealthyFilterMaskFromShootListFilters } from '@/composables/useShootListFilters'

describe('stores', () => {
  describe('seedStat', () => {
    let api
    let socketStore
    let seedStatStore

    beforeEach(() => {
      setActivePinia(createPinia())
      api = useApi()
      socketStore = useSocketStore()
      seedStatStore = useSeedStatStore()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should fetch seed stats', async () => {
      const getSeedStats = vi.spyOn(api, 'getSeedStats').mockResolvedValue({
        data: [{
          metadata: {
            name: 'infra1-seed',
            uid: 'seed-1',
          },
          counts: {
            shootCount: 3,
            unhealthyShoots: {
              total: 2,
              matching: 1,
            },
          },
        }],
      })

      seedStatStore.subscribe({ unhealthyFilterMask: 0 })
      await flushPromises()

      expect(getSeedStats).toHaveBeenCalledWith({ unhealthyFilterMask: 0 })
      expect(seedStatStore.shootCountForSeed('infra1-seed')).toBe(3)
      expect(seedStatStore.unhealthyShootsForSeed('infra1-seed')).toBe(1)
    })

    it('should fetch a single seed stat', async () => {
      const getSeedStat = vi.spyOn(api, 'getSeedStat').mockResolvedValue({
        data: {
          metadata: {
            name: 'infra1-seed',
            uid: 'seed-1',
          },
          counts: {
            shootCount: 4,
            unhealthyShoots: {
              total: 4,
              matching: 2,
            },
          },
        },
      })

      seedStatStore.subscribe({
        name: 'infra1-seed',
        unhealthyFilterMask: 3,
      })
      await flushPromises()

      expect(getSeedStat).toHaveBeenCalledWith({
        name: 'infra1-seed',
        unhealthyFilterMask: 3,
      })
      expect(seedStatStore.list).toEqual([
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'infra1-seed',
          }),
        }),
      ])
      expect(seedStatStore.unhealthyShootsForSeed('infra1-seed')).toBe(2)
    })

    it('should subscribe and unsubscribe seed stats', async () => {
      vi.spyOn(api, 'getSeedStats').mockResolvedValue({
        data: [],
      })
      vi.spyOn(socketStore, 'connected', 'get').mockReturnValue(true)
      const emitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockResolvedValue()
      const emitUnsubscribe = vi.spyOn(socketStore, 'emitUnsubscribe').mockResolvedValue()

      seedStatStore.subscribe({ unhealthyFilterMask: 3 })
      await flushPromises()

      expect(emitSubscribe).toHaveBeenCalledWith('seedstats', {
        unhealthyFilterMask: 3,
      })
      expect(seedStatStore.synchronizeOptions).toEqual({
        unhealthyFilterMask: 3,
      })

      seedStatStore.unsubscribe()
      await flushPromises()

      expect(emitUnsubscribe).toHaveBeenCalledWith('seedstats')
      expect(seedStatStore.subscription).toBe(null)
      expect(seedStatStore.list).toBe(null)
    })

    it('should cancel in-flight subscribe on unsubscribe', async () => {
      let fetchResolve
      const fetchPromise = new Promise(resolve => {
        fetchResolve = resolve
      })
      vi.spyOn(api, 'getSeedStats').mockReturnValue(fetchPromise)
      vi.spyOn(socketStore, 'connected', 'get').mockReturnValue(true)
      const emitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockResolvedValue()
      vi.spyOn(socketStore, 'emitUnsubscribe').mockResolvedValue()

      // Start subscribe — fetch will hang
      seedStatStore.subscribe({ unhealthyFilterMask: 0 })
      await flushPromises()

      // Unsubscribe while fetch is pending
      seedStatStore.unsubscribe()
      await flushPromises()

      // Now resolve the fetch — stale subscribe should not call openSubscription
      fetchResolve({ data: [{ metadata: { name: 'seed1' } }] })
      await flushPromises()

      expect(emitSubscribe).not.toHaveBeenCalled()
      expect(seedStatStore.subscription).toBe(null)
      expect(seedStatStore.list).toBe(null)
    })

    it('should cancel in-flight subscribe(A) when subscribe(B) is called', async () => {
      let fetchResolveA
      const fetchPromiseA = new Promise(resolve => {
        fetchResolveA = resolve
      })
      const fetchResultB = { data: [{ metadata: { name: 'seed-b' } }] }

      vi.spyOn(api, 'getSeedStats')
        .mockReturnValueOnce(fetchPromiseA)
        .mockResolvedValueOnce(fetchResultB)
      vi.spyOn(socketStore, 'connected', 'get').mockReturnValue(true)
      const emitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockResolvedValue()
      vi.spyOn(socketStore, 'emitUnsubscribe').mockResolvedValue()

      // Start subscribe A — fetch will hang
      seedStatStore.subscribe({ unhealthyFilterMask: 1 })
      await flushPromises()

      // Subscribe B before A completes
      seedStatStore.subscribe({ unhealthyFilterMask: 2 })
      await flushPromises()

      // Resolve A's fetch — should be ignored
      fetchResolveA({ data: [{ metadata: { name: 'seed-a' } }] })
      await flushPromises()

      // Final state should reflect B
      expect(seedStatStore.subscription).toEqual({ unhealthyFilterMask: 2 })
      expect(seedStatStore.list).toEqual([{ metadata: { name: 'seed-b' } }])
      expect(emitSubscribe).toHaveBeenCalledWith('seedstats', { unhealthyFilterMask: 2 })
    })

    it('should re-fetch and re-open on synchronize', async () => {
      const fetchData = [{ metadata: { name: 'seed1' }, counts: { shootCount: 5 } }]
      const getSeedStats = vi.spyOn(api, 'getSeedStats').mockResolvedValue({ data: fetchData })
      vi.spyOn(socketStore, 'connected', 'get').mockReturnValue(true)
      const emitSubscribe = vi.spyOn(socketStore, 'emitSubscribe').mockResolvedValue()
      vi.spyOn(socketStore, 'emitUnsubscribe').mockResolvedValue()

      seedStatStore.subscribe({ unhealthyFilterMask: 0 })
      await flushPromises()

      expect(getSeedStats).toHaveBeenCalledTimes(1)
      expect(emitSubscribe).toHaveBeenCalledTimes(1)

      // Trigger synchronize
      seedStatStore.synchronize()
      await flushPromises()

      expect(getSeedStats).toHaveBeenCalledTimes(2)
      expect(emitSubscribe).toHaveBeenCalledTimes(2)
    })

    it('should derive the unhealthy filter mask from shoot list filters', () => {
      expect(getUnhealthyFilterMaskFromShootListFilters({
        onlyShootsWithIssues: true,
        progressing: true,
        noOperatorAction: true,
        hideTicketsWithLabel: true,
      })).toBe(7)

      expect(getUnhealthyFilterMaskFromShootListFilters({
        onlyShootsWithIssues: false,
        progressing: true,
        noOperatorAction: true,
        hideTicketsWithLabel: true,
      })).toBe(0)
    })
  })
})
