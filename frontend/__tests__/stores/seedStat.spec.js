//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

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

      await seedStatStore.subscribe({ unhealthyFilterMask: 0 })

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

      await seedStatStore.subscribe({
        name: 'infra1-seed',
        unhealthyFilterMask: 3,
      })

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

      await seedStatStore.subscribe({ unhealthyFilterMask: 3 })

      expect(emitSubscribe).toHaveBeenCalledWith('seedstats', {
        unhealthyFilterMask: 3,
      })
      expect(seedStatStore.synchronizeOptions).toEqual({
        unhealthyFilterMask: 3,
      })

      await seedStatStore.unsubscribe()

      expect(emitUnsubscribe).toHaveBeenCalledWith('seedstats')
      expect(seedStatStore.subscription).toBe(null)
      expect(seedStatStore.list).toBe(null)
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
