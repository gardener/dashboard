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
const awsRoute53SecretName = 'aws-route53-secret'
const awsCredentialsBindingName = 'aws-credentialsbinding'
const awsWlidCredentialsBindingName = 'aws-wlid-credentialsbinding'
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
      vi.spyOn(api, 'updateDnsProviderCredential').mockImplementation(({ secret }) => {
        return {
          data: {
            secret,
          },
        }
      })
      vi.spyOn(api, 'updateInfraProviderCredential').mockImplementation(({ secret }) => {
        return {
          data: {
            secret,
          },
        }
      })
      vi.spyOn(api, 'createDnsProviderCredential').mockImplementation(({ secret }) => {
        return {
          data: {
            secret,
          },
        }
      })
      vi.spyOn(api, 'createInfraProviderCredential').mockImplementation(({ binding, secret }) => {
        return {
          data: {
            binding,
            secret,
          },
        }
      })
      vi.spyOn(api, 'deleteDnsProviderCredential').mockReturnValue()
      vi.spyOn(api, 'deleteInfraProviderCredential').mockReturnValue()
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
      api.createDnsProviderCredential.mockClear()
      api.createInfraProviderCredential.mockClear()
      api.updateDnsProviderCredential.mockClear()
      api.updateInfraProviderCredential.mockClear()
      api.deleteDnsProviderCredential.mockClear()
      api.deleteInfraProviderCredential.mockClear()
    })

    it('should create a new credential store', () => {
      expect(cloudProfileStore.sortedInfraProviderTypeList).toEqual(
        expect.arrayContaining(['aws', 'azure']),
      )
      expect(gardenerExtensionStore.dnsProviderTypes).toEqual(
        expect.arrayContaining(['aws-route53', 'azure-dns']),
      )
    })

    it('should return infrastructureBindingList', () => {
      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(cloudProfileStore.sortedInfraProviderTypeList).toMatchSnapshot()
    })

    it('should return dnsCredentialList', () => {
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
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
      expect(credentialStore.infrastructureBindingList.length).toBe(0)
      expect(credentialStore.dnsCredentialList.length).toBe(0)
      await credentialStore.fetchCredentials()
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
      expect(api.getCloudProviderCredentials).toBeCalledWith(testNamespace)
      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
    })

    it('should update credential (credentialsbinding/secret)', async () => {
      const awsSecretBinding = find(credentialStore.infrastructureBindingList, { metadata: { name: awsSecretBindingName } })
      let awsSecret = credentialStore.getSecret(awsSecretBinding.secretRef)
      const secret = {
        ...awsSecret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateInfraCredential({ binding: awsSecretBinding, secret })

      expect(api.updateInfraProviderCredential).toBeCalledTimes(1)
      expect(api.updateInfraProviderCredential).toBeCalledWith({ secret })
      awsSecret = credentialStore.getSecret(awsSecretBinding.secretRef)
      expect(awsSecret.data).toEqual({ newSecret2: 'dummy-data' })
    })

    it('should update dns credential (secret)', async () => {
      const awsRoute53Secret = find(credentialStore.dnsCredentialList, { metadata: { name: awsRoute53SecretName } })

      const secret = {
        ...awsRoute53Secret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateDnsCredential({ secret })

      expect(api.updateDnsProviderCredential).toBeCalledTimes(1)
      expect(api.updateDnsProviderCredential).toBeCalledWith({ secret })
      const updatedAwsRoute53Secret = find(credentialStore.dnsCredentialList, { metadata: { name: awsRoute53SecretName } })
      expect(updatedAwsRoute53Secret.data).toEqual({ newSecret2: 'dummy-data' })
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

      await credentialStore.createInfraCredential({ binding, secret })

      expect(api.createInfraProviderCredential).toBeCalledTimes(1)
      expect(api.createInfraProviderCredential).toBeCalledWith({ binding, secret })

      const newCredentialsBinding = find(credentialStore.infrastructureBindingList, { kind: 'CredentialsBinding', metadata: binding.metadata })
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

      await credentialStore.createDnsCredential({ secret })

      expect(api.createDnsProviderCredential).toBeCalledTimes(1)
      expect(api.createDnsProviderCredential).toBeCalledWith({ secret })

      const newDnsCredential = find(credentialStore.dnsCredentialList, { metadata: { name: 'my-new-dns-secret' } })
      expect(newDnsCredential.metadata.labels['provider.shoot.gardener.cloud/aws-route53']).toBe('true')
    })

    it('should delete credential (secretbinding)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (credentialsbinding/secret)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (credentialsbinding/workloadidentity)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsWlidCredentialsBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsWlidCredentialsBindingName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (dns secret)', async () => {
      await credentialStore.deleteDnsCredential({ credentialKind: 'Secret', credentialNamespace: testNamespace, credentialName: 'aws-route53-secret' })

      expect(api.deleteDnsProviderCredential).toBeCalledTimes(1)
      expect(api.deleteDnsProviderCredential).toBeCalledWith({ credentialKind: 'Secret', credentialNamespace: testNamespace, credentialName: 'aws-route53-secret' })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('store should be resetted in case of a fetch error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
      await expect(credentialStore.fetchCredentials()).rejects.toThrow(Error)
      expect(credentialStore.infrastructureBindingList.length).toBe(0)
      expect(credentialStore.dnsCredentialList.length).toBe(0)
    })
    it('store should be resetted after setting new data', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
      credentialStore._setCredentials({})
      expect(credentialStore.infrastructureBindingList.length).toBe(0)
      expect(credentialStore.dnsCredentialList.length).toBe(0)
    })
  })
})
