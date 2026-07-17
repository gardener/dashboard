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
  })
})
