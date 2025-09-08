//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAppStore } from '@/store/app'
import { useAuthzStore } from '@/store/authz'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import { useApi } from '@/composables/useApi'

import find from 'lodash/find'

const testNamespace = 'garden-test'
const awsSecretBindingName = 'aws-secretbinding'
const awsCredentialsBindingName = 'aws-credentialsbinding'
const newSecret = {
  apiVersion: 'v1',
  kind: 'Secret',
  type: 'Opaque',
  metadata: {
    name: 'my-new-secret',
    namespace: testNamespace,
  },
  data: {
    newSecret: 'dummy-data',
  },
}

describe('stores', () => {
  describe('credential', () => {
    let api
    let appStore
    let authzStore
    let cloudProfileStore
    let gardenerExtensionStore
    let credentialStore

    beforeEach(async () => {
      setActivePinia(createPinia())
      api = useApi()
      vi.spyOn(api, 'getCloudProviderCredentials').mockImplementation(namespace => {
        if (namespace !== testNamespace) {
          throw new Error('Unauthorized')
        }
        return {
          data: fixtures.credentials,
        }
      })
      vi.spyOn(api, 'updateCloudProviderCredential').mockImplementation(({ binding, secret }) => {
        return {
          data: {
            binding,
            secret,
          },
        }
      })
      vi.spyOn(api, 'createCloudProviderCredential').mockImplementation(({ binding, secret }) => {
        return {
          data: {
            binding,
            secret,
          },
        }
      })
      vi.spyOn(api, 'deleteCloudProviderCredential').mockReturnValue()
      appStore = useAppStore()
      vi.spyOn(appStore, 'setSuccess')
      authzStore = useAuthzStore()
      authzStore.setNamespace(testNamespace)
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.list = fixtures.cloudprofiles
      gardenerExtensionStore = useGardenerExtensionStore()
      gardenerExtensionStore.list = fixtures.gardenerExtensions
      credentialStore = useCredentialStore()
      credentialStore._setCredentials(fixtures.credentials)
    })

    afterEach(() => {
      appStore.setSuccess.mockClear()
      api.getCloudProviderCredentials.mockClear()
      api.createCloudProviderCredential.mockClear()
      api.updateCloudProviderCredential.mockClear()
      api.deleteCloudProviderCredential.mockClear()
    })

    it('should create a new credential store', () => {
      expect(cloudProfileStore.sortedProviderTypeList).toEqual(
        expect.arrayContaining(['aws', 'azure']),
      )
      expect(gardenerExtensionStore.dnsProviderTypes).toEqual(
        expect.arrayContaining(['aws-route53', 'azure-dns']),
      )
    })

    it('should return infrastructureBindingList', () => {
      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(credentialStore.infrastructureBindingList.length)
      expect(cloudProfileStore.sortedProviderTypeList).toMatchSnapshot()
    })

    it('should return dnsCredentialList', () => {
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(credentialStore.dnsCredentialList.length)
      expect(gardenerExtensionStore.dnsProviderTypes).toMatchSnapshot()
    })

    it('should ignore dns bindings from secretbindings', () => {
      const fixturesWithDnsBinding = JSON.parse(JSON.stringify(fixtures.credentials))
      fixturesWithDnsBinding.secretBindings.push({
        kind: 'SecretBinding',
        metadata: {
          namespace: testNamespace,
          name: 'aws-route53-secretbinding',
        },
        provider: { type: 'aws-route53' },
        secretRef: {
          namespace: testNamespace,
          name: 'aws-route53-secret',
        },
      })
      credentialStore._setCredentials(fixturesWithDnsBinding)
      const names = credentialStore.dnsCredentialList.map(item => item.metadata.name)
      expect(names).toEqual(expect.arrayContaining(['aws-route53-secret', 'azure-dns-secret']))
      expect(names).not.toContain('aws-route53-secretbinding')
    })

    it('should fetchCredentials', async () => {
      credentialStore.$reset()
      expect(credentialStore.cloudProviderBindingList.length).toBe(0)
      await credentialStore.fetchCredentials()
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
      expect(api.getCloudProviderCredentials).toBeCalledWith(testNamespace)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(0)
    })

    it('should update credential (secret)', async () => {
      const awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      let awsSecret = credentialStore.getSecret(awsSecretBinding.secretRef)
      const secret = {
        ...awsSecret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateCredential({ binding: awsSecretBinding, secret })

      expect(api.updateCloudProviderCredential).toBeCalledTimes(1)
      expect(api.updateCloudProviderCredential).toBeCalledWith({ secret })
      awsSecret = credentialStore.getSecret(awsSecretBinding.secretRef)
      expect(awsSecret.data).toEqual({ newSecret2: 'dummy-data' })
    })

    it('should create credential (credentialsbinding)', async () => {
      const secret = newSecret
      const binding = {
        apiVersion: 'security.gardener.cloud/v1alpha1',
        kind: 'CredentialsBinding',
        metadata: {
          namespace: testNamespace,
          name: 'my-new-secret-binding',
        },
        provider: {
          type: 'aws',
        },
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace: testNamespace,
          name: 'my-new-secret',
        },
      }

      await credentialStore.createCredential({ binding, secret })

      expect(api.createCloudProviderCredential).toBeCalledTimes(1)
      expect(api.createCloudProviderCredential).toBeCalledWith({ binding, secret })

      const newCredentialsBinding = find(credentialStore.cloudProviderBindingList, { kind: 'CredentialsBinding', metadata: binding.metadata })
      expect(newCredentialsBinding.metadata.namespace).toEqual(testNamespace)
      expect(newCredentialsBinding.provider.type).toEqual('aws')
      const createdSecret = credentialStore.getSecret(newCredentialsBinding.credentialsRef)
      expect(createdSecret.data).toEqual({ newSecret: 'dummy-data' })
    })

    it('should create credential (dns secret)', async () => {
      const secret = {
        ...newSecret,
        metadata: {
          ...newSecret.metadata,
          name: 'my-new-dns-secret',
          labels: { 'provider.shoot.gardener.cloud/aws-route53': 'true' },
        },
      }

      await credentialStore.createCredential({ secret })

      expect(api.createCloudProviderCredential).toBeCalledTimes(1)
      expect(api.createCloudProviderCredential).toBeCalledWith({ secret })

      const newDnsCredential = find(credentialStore.cloudProviderBindingList, { metadata: { name: 'my-new-dns-secret' } })
      expect(newDnsCredential.provider.type).toBe('aws-route53')
    })

    it('should delete credential (secretbinding)', async () => {
      await credentialStore.deleteCredential({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName })

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (credentialsbinding)', async () => {
      await credentialStore.deleteCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName })

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (dns secret)', async () => {
      await credentialStore.deleteCredential({ credentialKind: 'Secret', credentialNamespace: testNamespace, credentialName: 'aws-route53-secret' })

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ credentialKind: 'Secret', credentialNamespace: testNamespace, credentialName: 'aws-route53-secret' })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (workloadidentity)', async () => {
      await credentialStore.deleteCredential({ credentialKind: 'WorkloadIdentity', credentialNamespace: testNamespace, credentialName: 'aws-wlid-workloadidentity' })

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ credentialKind: 'WorkloadIdentity', credentialNamespace: testNamespace, credentialName: 'aws-wlid-workloadidentity' })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('store should be resetted in case of a fetch error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(0)
      await expect(credentialStore.fetchCredentials()).rejects.toThrow(Error)
      expect(credentialStore.cloudProviderBindingList.length).toBe(0)
    })
    it('store should be resetted after setting new data', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(0)
      credentialStore._setCredentials({})
      expect(credentialStore.cloudProviderBindingList.length).toBe(0)
    })
  })
})
