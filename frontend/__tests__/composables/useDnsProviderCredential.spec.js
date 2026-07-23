//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
import { ref } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useShootStore } from '@/store/shoot'
import { useCredentialStore } from '@/store/credential'

import { useDnsProviderCredential } from '@/composables/credential/useDnsProviderCredential'

import find from 'lodash/find'

describe('useDnsProviderCredential composable', () => {
  let shootStore
  let credentialStore

  beforeEach(() => {
    setActivePinia(createPinia())

    shootStore = useShootStore()
    shootStore.state.shoots = {
      'abc-123': {
        metadata: { name: 'shoot-1', uid: 'abc-123' },
      },
      'abc-124': {
        metadata: { name: 'shoot-2', uid: 'abc-124' },
        spec: {
          dns: {
            providers: [
              {
                primary: true,
                type: 'aws-route53',
                credentialsRef: { apiVersion: 'v1', kind: 'Secret', name: 'aws-route53-secret' },
              },
            ],
          },
        },
      },
      'abc-125': {
        metadata: { name: 'shoot-3', uid: 'abc-125' },
        spec: {
          resources: [
            {
              name: 'shoot-dns-service-aws-route53-secret',
              resourceRef: { apiVersion: 'v1', kind: 'Secret', name: 'aws-route53-secret' },
            },
          ],
        },
      },
    }

    credentialStore = useCredentialStore()
    credentialStore._setCredentials(fixtures.credentials)
  })

  function findDnsCredentialRef (name) {
    const credential = find(credentialStore.dnsCredentialList, c => c.metadata.name === name)
    return ref(credential)
  }

  it('counts shoots referencing dns secret', () => {
    const dnsCredentialRef = findDnsCredentialRef('aws-route53-secret')
    const composable = useDnsProviderCredential(dnsCredentialRef)
    expect(composable.credentialUsageCount.value).toBe(2)
  })

  it('resolves secret details using the dns vendor configuration', () => {
    const dnsCredentialRef = findDnsCredentialRef('aws-route53-secret')
    const configStore = {
      vendorDetails: vi.fn(() => ({
        secret: {
          details: [
            {
              label: 'Secret',
              valueFrom: {
                key: ['secret'],
              },
            },
          ],
        },
      })),
    }
    const composable = useDnsProviderCredential(dnsCredentialRef, { configStore })

    expect(composable.credentialDetails.value).toEqual([
      {
        label: 'Secret',
        value: 's',
      },
    ])
    expect(configStore.vendorDetails).toHaveBeenCalledTimes(1)
    expect(configStore.vendorDetails).toHaveBeenCalledWith({
      type: 'dns',
      name: 'aws-route53',
    })
  })

  it('counts shoots referencing legacy dns provider secretName', () => {
    shootStore.state.shoots['abc-126'] = {
      metadata: { name: 'shoot-4', uid: 'abc-126' },
      spec: {
        dns: {
          providers: [
            { primary: true, type: 'aws-route53', secretName: 'aws-route53-secret' },
          ],
        },
      },
    }

    const dnsCredentialRef = findDnsCredentialRef('aws-route53-secret')
    const composable = useDnsProviderCredential(dnsCredentialRef)
    expect(composable.credentialUsageCount.value).toBe(3)
  })
})
