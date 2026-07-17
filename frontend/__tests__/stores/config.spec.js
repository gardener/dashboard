//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useConfigStore } from '@/store/config'

describe('stores', () => {
  describe('config', () => {
    let configStore

    beforeEach(() => {
      setActivePinia(createPinia())
      configStore = useConfigStore()
      configStore.setConfiguration({
        branding: {
          infraVendors: [{
            name: 'shared-provider',
            displayName: 'Infrastructure Provider',
          }],
          dnsVendors: [{
            name: 'shared-provider',
            displayName: 'DNS Provider',
          }],
        },
      })
    })

    it('looks up vendors by type and name', () => {
      expect(configStore.vendorDetails({
        type: 'infra',
        name: 'shared-provider',
      })).toMatchObject({
        type: 'infra',
        name: 'shared-provider',
        displayName: 'Infrastructure Provider',
      })

      expect(configStore.vendorDetails({
        type: 'dns',
        name: 'shared-provider',
      })).toMatchObject({
        type: 'dns',
        name: 'shared-provider',
        displayName: 'DNS Provider',
      })
    })

    it('looks up display names by type and name', () => {
      expect(configStore.vendorDisplayName({
        type: 'infra',
        name: 'shared-provider',
      })).toBe('Infrastructure Provider')

      expect(configStore.vendorDisplayName({
        type: 'dns',
        name: 'shared-provider',
      })).toBe('DNS Provider')
    })

    it('provides built-in shoot defaults', () => {
      expect(configStore.defaultNodesCIDR).toBe('10.250.0.0/16')
      expect(configStore.defaultPurposes).toEqual(['evaluation', 'development', 'testing', 'production'])
      expect(configStore.defaultWorkerlessCluster).toBe(false)
      expect(configStore.defaultControlPlaneHighAvailability).toBe(false)
      expect(configStore.defaultAutoscalerMin).toBe(1)
      expect(configStore.defaultAutoscalerMax).toBe(2)
      expect(configStore.defaultMaxSurge).toBe(1)
      expect(configStore.defaultZonesSelectAll).toBe(false)
      expect(configStore.defaultMaintenanceHours).toEqual(['22', '23', '00', '01', '02', '03', '04', '05'])
      expect(configStore.defaultMaintenanceWindowSizeMinutes).toBe(60)
      expect(configStore.defaultAutoUpdateOS).toBe(true)
      expect(configStore.defaultAutoUpdateKubernetes).toBe(true)
    })

    it('uses nested shoot defaults and preserves explicit falsy values', () => {
      configStore.setConfiguration({
        shootDefaults: {
          workerlessCluster: false,
          controlPlaneHighAvailability: false,
          autoscalerMin: 0,
          autoscalerMax: 0,
          maxSurge: 0,
          zonesSelectAll: false,
          autoUpdateOS: false,
          autoUpdateKubernetes: false,
          loadBalancerProvider: 'octavia',
          loadbalancerProvider: 'legacy-spelling',
        },
      })

      expect(configStore.defaultWorkerlessCluster).toBe(false)
      expect(configStore.defaultControlPlaneHighAvailability).toBe(false)
      expect(configStore.defaultAutoscalerMin).toBe(0)
      expect(configStore.defaultAutoscalerMax).toBe(0)
      expect(configStore.defaultMaxSurge).toBe(0)
      expect(configStore.defaultZonesSelectAll).toBe(false)
      expect(configStore.defaultAutoUpdateOS).toBe(false)
      expect(configStore.defaultAutoUpdateKubernetes).toBe(false)
      expect(configStore.defaultLoadBalancerProvider).toBe('octavia')
    })

    it('supports legacy settings while preferring nested replacements', () => {
      configStore.setConfiguration({
        controlPlaneHighAvailabilityHelp: { text: 'legacy help' },
        defaultHibernationSchedule: { evaluation: [{ start: 'legacy' }] },
        defaultNodesCIDR: '10.0.0.0/16',
        shootDefaults: {
          controlPlaneHighAvailabilityHelp: { text: 'nested help' },
          hibernationSchedule: { development: [{ start: 'nested' }] },
          nodesCIDR: '10.1.0.0/16',
        },
      })

      expect(configStore.controlPlaneHighAvailabilityHelp).toEqual({ text: 'nested help' })
      expect(configStore.defaultHibernationSchedule).toEqual({ development: [{ start: 'nested' }] })
      expect(configStore.defaultNodesCIDR).toBe('10.1.0.0/16')

      configStore.setConfiguration({
        controlPlaneHighAvailabilityHelp: { text: 'legacy help' },
        defaultHibernationSchedule: { evaluation: [{ start: 'legacy' }] },
        defaultNodesCIDR: '10.0.0.0/16',
      })

      expect(configStore.controlPlaneHighAvailabilityHelp).toEqual({ text: 'legacy help' })
      expect(configStore.defaultHibernationSchedule).toEqual({ evaluation: [{ start: 'legacy' }] })
      expect(configStore.defaultNodesCIDR).toBe('10.0.0.0/16')
    })

    it('falls back to safe maintenance hours for an empty configuration', () => {
      configStore.setConfiguration({
        shootDefaults: {
          maintenanceHours: [],
        },
      })

      expect(configStore.defaultMaintenanceHours).toEqual(['22', '23', '00', '01', '02', '03', '04', '05'])
    })
  })
})
