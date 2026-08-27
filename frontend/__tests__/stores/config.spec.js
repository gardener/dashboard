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

import netlifyDns from '@/data/vendors/dns/netlify'

describe('stores', () => {
  describe('config', () => {
    let configStore

    beforeEach(() => {
      setActivePinia(createPinia())
      configStore = useConfigStore()
      configStore.setConfiguration({
        branding: {
          infraVendors: [{
            name: 'aws',
            displayName: 'Infrastructure Provider',
          }, {
            name: 'custom-infra',
            displayName: 'Custom Infrastructure Provider',
            secret: {
              details: [{ label: 'Injected Detail' }],
            },
          }],
          dnsVendors: [{
            name: 'netlify-dns',
            displayName: 'Branded Netlify',
            weight: 1,
            icon: 'custom-netlify.svg',
            type: 'infra',
            secret: {
              details: [{ label: 'Injected Detail' }],
              fields: [],
              help: '<p>Injected help</p>',
            },
            undocumented: true,
          }, {
            name: 'custom-dns',
            displayName: 'Custom DNS Provider',
            weight: 2,
            icon: 'custom-dns.svg',
            secret: {
              fields: [],
              help: '<p>Injected help</p>',
            },
          }],
          machineImageVendors: [{
            name: 'custom-image',
            displayName: 'Custom Image',
            weight: 2,
            icon: 'custom-image.svg',
            secret: {
              fields: [],
            },
          }],
        },
      })
    })

    it('applies documented overrides without replacing internal vendor metadata', () => {
      expect(configStore.vendorDetails({
        type: 'dns',
        name: 'netlify-dns',
      })).toEqual({
        ...netlifyDns,
        type: 'dns',
        displayName: 'Branded Netlify',
        weight: 1,
        icon: 'custom-netlify.svg',
      })

      expect(configStore.sortedDnsProviderTypeList[0]).toBe('netlify-dns')
    })

    it('uses configured display names for known providers', () => {
      expect(configStore.vendorDisplayName({
        type: 'infra',
        name: 'aws',
      })).toBe('Infrastructure Provider')

      expect(configStore.vendorDisplayName({
        type: 'dns',
        name: 'netlify-dns',
      })).toBe('Branded Netlify')
    })

    it('allows custom infrastructure and DNS vendors using documented properties only', () => {
      expect(configStore.sortedDnsProviderTypeList).toContain('custom-dns')
      expect(configStore.vendorDetails({
        type: 'infra',
        name: 'custom-infra',
      })).toEqual({
        type: 'infra',
        name: 'custom-infra',
        displayName: 'Custom Infrastructure Provider',
        weight: Number.MAX_SAFE_INTEGER,
      })
      expect(configStore.vendorDetails({
        type: 'dns',
        name: 'custom-dns',
      })).toEqual({
        type: 'dns',
        name: 'custom-dns',
        displayName: 'Custom DNS Provider',
        weight: 2,
        icon: 'custom-dns.svg',
      })
    })

    it('hides gdch-dns by default', () => {
      expect(configStore.sortedDnsProviderTypeList).not.toContain('gdch-dns')
    })

    it('allows explicitly enabling a list of DNS providers', () => {
      configStore.setConfiguration({
        branding: {
          enabledDnsProviders: ['gdch-dns'],
        },
      })

      expect(configStore.sortedDnsProviderTypeList).toEqual(['gdch-dns'])
    })

    it('allows branding CloudProfile-provided machine image names using documented properties only', () => {
      expect(configStore.vendorDetails({
        type: 'machineImage',
        name: 'custom-image',
      })).toEqual({
        type: 'machineImage',
        name: 'custom-image',
        displayName: 'Custom Image',
        weight: 2,
        icon: 'custom-image.svg',
      })
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

    it.each([
      { maintenanceHours: [] },
      { maintenanceHours: ['24'] },
      { maintenanceHours: ['1'] },
      { maintenanceHours: [12] },
      { maintenanceHours: ['12.5'] },
    ])('falls back to safe maintenance hours for an invalid configuration: $maintenanceHours', ({ maintenanceHours }) => {
      configStore.setConfiguration({
        shootDefaults: {
          maintenanceHours,
        },
      })

      expect(configStore.defaultMaintenanceHours).toEqual(['22', '23', '00', '01', '02', '03', '04', '05'])
    })

    it('accepts configured maintenance hours from 00 through 23', () => {
      configStore.setConfiguration({
        shootDefaults: {
          maintenanceHours: ['00', '12', '23'],
        },
      })

      expect(configStore.defaultMaintenanceHours).toEqual(['00', '12', '23'])
    })
  })
})
