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

import { useCredential } from '@/composables/credential/useCloudProviderCredential'

import find from 'lodash/find'

describe('useCredential composable', () => {
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

  function findCredentialRef (name) {
    return ref(find(credentialStore.cloudProviderBindingList, c => c.metadata.name === name))
  }

  it('counts shoots referencing dns secret', () => {
    const credentialRef = findCredentialRef('aws-route53-secret')
    const composable = useCredential(credentialRef)
    expect(composable.credentialUsageCount.value).toBe(2)
  })
})
