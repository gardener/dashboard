//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
        metadata: { name: 'shoot-1', namespace: 'garden-test', uid: 'abc-123' },
        spec: {
          credentialsBindingName: 'aws-credentialsbinding',
        },
      },
      'abc-124': {
        metadata: { name: 'shoot-2', namespace: 'garden-test', uid: 'abc-124' },
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
        metadata: { name: 'shoot-3', namespace: 'garden-test', uid: 'abc-125' },
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
    expect(bindingComposable.isSharedBinding.value).toBe(true)
    expect(bindingComposable.isOrphanedBinding.value).toBe(false)
  })

  it('resolves secretbinding bindingCredentialRef/name/namespace', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    expect(bindingComposable.bindingCredentialRef.value).toEqual({
      namespace: secretBindingRef.value.secretRef.namespace,
      name: secretBindingRef.value.secretRef.name,
    })
    expect(bindingComposable.credentialNamespace.value).toBe(secretBindingRef.value.secretRef.namespace)
    expect(bindingComposable.credentialName.value).toBe(secretBindingRef.value.secretRef.name)
    expect(bindingComposable.credentialKind.value).toBe('Secret')
  })

  it('resolves credentialsbinding bindingCredentialRef/name/namespace', () => {
    const credentialsBindingRef = findBindingRef('aws-credentialsbinding')
    const bindingComposable = useCloudProviderBinding(credentialsBindingRef)
    expect(bindingComposable.bindingCredentialRef.value).toEqual({
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

  it('resolves an owned WorkloadIdentity from a CredentialsBinding', () => {
    const bindingComposable = useCloudProviderBinding(findBindingRef('aws-wlid-credentialsbinding'))

    expect(bindingComposable.hasWorkloadIdentity.value).toBe(true)
    expect(bindingComposable.credential.value).toMatchObject({
      kind: 'WorkloadIdentity',
      metadata: { name: 'aws-wlid-workloadidentity', namespace: 'garden-test' },
    })
  })

  it('resolves secret details using the infra vendor configuration', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
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
    const bindingComposable = useCloudProviderBinding(secretBindingRef, { configStore })

    expect(bindingComposable.credentialDetails.value).toEqual([
      {
        label: 'Secret',
        value: 's',
      },
    ])
    expect(configStore.vendorDetails).toHaveBeenCalledTimes(1)
    expect(configStore.vendorDetails).toHaveBeenCalledWith({
      type: 'infra',
      name: 'aws',
    })
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

  it('ignores binding references from a different or missing namespace', () => {
    shootStore.state.shoots = {
      other: {
        metadata: { name: 'other', namespace: 'garden-other' },
        spec: { secretBindingName: 'aws-secretbinding' },
      },
      missing: {
        metadata: { name: 'missing' },
        spec: { secretBindingName: 'aws-secretbinding' },
      },
    }

    const bindingComposable = useCloudProviderBinding(findBindingRef('aws-secretbinding'))

    expect(bindingComposable.credentialUsageCount.value).toBe(0)
  })

  it('finds other bindings with same secret', () => {
    const secretBindingRef = findBindingRef('aws-secretbinding')
    const bindingComposable = useCloudProviderBinding(secretBindingRef)
    const others = bindingComposable.bindingsWithSameCredential.value
    expect(others.length).toBeGreaterThanOrEqual(1)
    expect(others).toMatchSnapshot()
  })

  it('matches binding references by kind, effective namespace, and name', () => {
    const current = {
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'CredentialsBinding',
      metadata: { name: 'current', namespace: 'garden-test', uid: 'current' },
      provider: { type: 'aws' },
      credentialsRef: { apiVersion: 'v1', kind: 'Secret', name: 'shared' },
    }
    const same = {
      ...current,
      metadata: { name: 'same', namespace: 'garden-test', uid: 'same' },
    }
    const otherNamespace = {
      ...current,
      metadata: { name: 'other-namespace', namespace: 'garden-other', uid: 'other-namespace' },
    }
    const otherKind = {
      ...current,
      metadata: { name: 'other-kind', namespace: 'garden-test', uid: 'other-kind' },
      credentialsRef: { apiVersion: 'security.gardener.cloud/v1alpha1', kind: 'WorkloadIdentity', name: 'shared' },
    }
    credentialStore._setCredentials({
      secrets: [
        { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'shared', namespace: 'garden-test' } },
      ],
      credentialsBindings: [current, same, otherNamespace, otherKind],
    })

    const composable = useCloudProviderBinding(ref(current))

    expect(composable.credentialNamespace.value).toBe('garden-test')
    expect(composable.bindingsWithSameCredential.value).toEqual([same])
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
