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
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'

import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import find from 'lodash/find'

describe('useCloudProviderBinding composable', () => {
  let shootStore
  let cloudProfileStore
  let gardenerExtensionStore
  let credentialStore

  beforeEach(() => {
    setActivePinia(createPinia())

    shootStore = useShootStore()
    shootStore.state.shoots = {
      'abc-123': {
        metadata: { name: 'shoot-1', uid: 'abc-123' },
        spec: {
          credentialsBindingName: 'aws-credentialsbinding',
        },
      },
      'abc-124': {
        metadata: { name: 'shoot-2', uid: 'abc-124' },
        spec: {
          secretBindingName: 'aws-secretbinding',
          dns: {
            providers: [
              {
                primary: true,
                type: 'aws-route53',
                secretName: 'aws-route53-secret',
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
              resourceRef: {
                apiVersion: 'v1',
                kind: 'Secret',
                name: 'aws-route53-secret',
              },
            },
          ],
        },
      },
    }

    cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.list = fixtures.cloudprofiles
    gardenerExtensionStore = useGardenerExtensionStore()
    gardenerExtensionStore.list = fixtures.gardenerExtensions
    credentialStore = useCredentialStore()
    credentialStore._setCredentials(fixtures.credentials)
  })

  function findBindingRef (name) {
    return ref(
      find(
        credentialStore.infrastructureBindingList,
        b => b.metadata.name === name,
      ),
    )
  }

  it('throws if passed a non-ref', () => {
    expect(() => useCloudProviderBinding({})).toThrow(TypeError)
  })

  it('classifies secret vs credentials binding', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const credsBindingRef = findBindingRef('aws-credentialsbinding')
    const secretBindingComposable = useCloudProviderBinding(secretBindingRef)
    const credBindingComposable = useCloudProviderBinding(credsBindingRef)

    expect(secretBindingComposable.isSecretBinding.value).toBe(true)
    expect(secretBindingComposable.isCredentialsBinding.value).toBe(false)
    expect(credBindingComposable.isCredentialsBinding.value).toBe(true)
    expect(credBindingComposable.isSecretBinding.value).toBe(false)
  })

  it('identifies shared vs own credentials', () => {
    const sharedBindingRef = findBindingRef('aws-trial-secretbinding')
    const bindingComposable = useCloudProviderBinding(sharedBindingRef)
    expect(bindingComposable.isSharedCredential.value).toBe(true)
    expect(bindingComposable.isOrphanedBinding.value).toBe(false)
  })

  it('resolves secretbinding credentialRef/name/namespace', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.credentialRef.value).toEqual({
      namespace: secretBindingRef.value.secretRef.namespace,
      name: secretBindingRef.value.secretRef.name,
    })
    expect(bindingComposable.credentialNamespace.value).toBe(secretBindingRef.value.secretRef.namespace)
    expect(bindingComposable.credentialName.value).toBe(secretBindingRef.value.secretRef.name)
    expect(bindingComposable.credentialKind.value).toBe('Secret')
  })

  it('resolves credentialsbinding credentialRef/name/namespace', () => {
    const credentialsBindingRef = findBindingRef('aws-credentialsbinding')
    const bindingComposable = useCloudProviderBinding(credentialsBindingRef)
    expect(bindingComposable.credentialRef.value).toEqual({
      namespace: credentialsBindingRef.value.credentialsRef.namespace,
      name: credentialsBindingRef.value.credentialsRef.name,
      kind: credentialsBindingRef.value.credentialsRef.kind,
    })
    expect(bindingComposable.credentialNamespace.value).toBe(credentialsBindingRef.value.credentialsRef.namespace)
    expect(bindingComposable.credentialName.value).toBe(credentialsBindingRef.value.credentialsRef.name)
    expect(bindingComposable.credentialKind.value).toBe(credentialsBindingRef.value.credentialsRef.kind)
  })

  it('fetches actual secret from store', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.credential.value).toMatchSnapshot()
  })

  it('counts shoots referencing infra secretbinding', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.isInfrastructureBinding.value).toBe(true)
    expect(bindingComposable.credentialUsageCount.value).toBe(1)
  })

  it('counts shoots referencing infra credentialsbinding', () => {
    const credentialsBindingRef = findBindingRef('aws-credentialsbinding')
    const bindingComposable = useCloudProviderBinding(credentialsBindingRef)
    expect(bindingComposable.isInfrastructureBinding.value).toBe(true)
    expect(bindingComposable.credentialUsageCount.value).toBe(1)
  })

  it('finds other bindings with same secret', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    const others = bindingComposable.bindingsWithSameCredential.value
    expect(others.length).toBeGreaterThanOrEqual(1)
    expect(others).toMatchSnapshot()
  })

  it('lists applicable quotas and computes selfTerminationDays', () => {
    const secretBindingRef = findBindingRef('azure-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.quotas.value.length).toBe(2)
    expect(bindingComposable.selfTerminationDays.value).toBe(7)
  })

  it('marks bindings for deletion when deletionTimestamp is set', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    secretBindingRef.value.metadata.deletionTimestamp = new Date().toISOString()
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.isMarkedForDeletion.value).toBe(true)
  })
})
