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

import { useCloudProviderCredential } from '@/composables/credential/useCloudProviderCredential'

import find from 'lodash/find'

describe('useCloudProviderCredential composable', () => {
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
              { primary: true, type: 'aws-route53', secretName: 'aws-route53-secret' },
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

  function findbindingCredentialRef (name) {
    const credential = find(credentialStore.dnsCredentialList, c => c.metadata.name === name)
    return ref(credential)
  }

  it('counts shoots referencing dns secret', () => {
    const bindingCredentialRef = findbindingCredentialRef('aws-route53-secret')
    const composable = useCloudProviderCredential(bindingCredentialRef)
    expect(composable.credentialUsageCount.value).toBe(2)
  })
})
