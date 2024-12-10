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
import map from 'lodash/map'

const testNamespace = 'garden-test'
const awsSecretBindingName = 'aws-secretbinding'
const awsSecretName = 'aws-secret'
const awsTrialSecretBindingName = 'aws-trial-secretbinding'
const azureSecretBindingName = 'azure-secretbinding'

const toSecretData = secretStringData => {
  return Object.entries(secretStringData).reduce((accumulator, [key, value]) => {
    accumulator[key] = Buffer.from(value).toString('base64')
    return accumulator
  }, {})
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
      vi.spyOn(api, 'getCloudProviderCredentials').mockImplementation(({ namespace }) => {
        if (namespace !== testNamespace) {
          throw new Error('Unauthorized')
        }
        return {
          data: fixtures.credentials,
        }
      })
      vi.spyOn(api, 'updateCloudProviderCredential').mockImplementation(({ name, namespace, params }) => {
        if (namespace !== testNamespace) {
          throw new Error('Unauthorized')
        }
        const secretBinding = find(credentialStore.secretBindingList, { metadata: { namespace, name } })
        const secretData = toSecretData(params.secretStringData)

        return {
          data: {
            secretBinding,
            secret: {
              metadata: {
                ...secretBinding.secretRef,
              },
              data: {
                ...secretData,
              },
            },
          },
        }
      })
      vi.spyOn(api, 'createCloudProviderCredential').mockImplementation(({ name, namespace, params }) => {
        if (namespace !== testNamespace) {
          throw new Error('Unauthorized')
        }
        const secretData = toSecretData(params.secretStringData)

        return {
          data: {
            secretBinding: {
              metadata: {
                namespace,
                name,
              },
              provider: {
                type: params.providerType,
              },
              secretRef: {
                name,
                namespace,
              },
            },
            secret: {
              metadata: {
                name,
                namespace,
              },
              data: {
                ...secretData,
              },
            },
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
      credentialStore.setCredentials(fixtures.credentials)
    })

    afterEach(() => {
      appStore.setSuccess.mockClear()
      api.getCloudProviderCredentials.mockClear()
      api.createCloudProviderCredential.mockClear()
      api.updateCloudProviderCredential.mockClear()
      api.deleteCloudProviderCredential.mockClear()
    })

    it('should create a new credential store', () => {
      expect(credentialStore.isInitial).toBe(false)
      expect(cloudProfileStore.sortedProviderTypeList).toEqual(
        expect.arrayContaining(['aws', 'azure']),
      )
      expect(gardenerExtensionStore.dnsProviderTypes).toEqual(
        expect.arrayContaining(['aws-route53', 'azure-dns']),
      )
    })

    it('should return secretBindingList with resolved secret', () => {
      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
      const awsSecretBinding = find(credentialStore.secretBindingList, { metadata: { name: awsSecretBindingName } })
      expect(awsSecretBinding.secretRef.name).toBe(awsSecretBinding._secret.metadata.name)
      expect(awsSecretBinding.secretRef.namespace).toBe(awsSecretBinding._secret.metadata.namespace)
    })

    it('should return secretBindingList with trial quota and secret from other namespace', () => {
      const awsTrialSecretBinding = find(credentialStore.secretBindingList, { metadata: { name: awsTrialSecretBindingName } })
      expect(awsTrialSecretBinding._secret).toBeUndefined()
      expect(awsTrialSecretBinding.secretRef.namespace).toBe(awsTrialSecretBinding._quotas[0].metadata.namespace)
    })

    it('should return secretBindingList with multiple quotas', () => {
      const azureSecretBinding = find(credentialStore.secretBindingList, { metadata: { name: azureSecretBindingName } })
      expect(azureSecretBinding._secret).toBeDefined()
      expect(azureSecretBinding._quotas.length).toBe(2)
      const azureQuota = find(credentialStore.quotaList, { metadata: azureSecretBinding.quotas[1] })
      expect(azureQuota).toBeDefined()
    })

    it('should return infrastructureSecretBindingsList', () => {
      expect(credentialStore.infrastructureSecretBindingsList.length).toBeGreaterThan(0)
      expect(credentialStore.secretBindingList.length).toBeGreaterThan(credentialStore.infrastructureSecretBindingsList.length)
      expect(cloudProfileStore.sortedProviderTypeList).toEqual(
        expect.arrayContaining(map(credentialStore.infrastructureSecretBindingsList, 'provider.type')),
      )
    })

    it('should return dnsSecretBindingsList', () => {
      expect(credentialStore.dnsSecretBindingsList.length).toBeGreaterThan(0)
      expect(credentialStore.secretBindingList.length).toBeGreaterThan(credentialStore.dnsSecretBindingsList.length)
      expect(gardenerExtensionStore.dnsProviderTypes).toEqual(
        expect.arrayContaining(map(credentialStore.dnsSecretBindingsList, 'provider.type')),
      )
    })

    it('should return getSecret', () => {
      expect(credentialStore.getSecret({ namespace: testNamespace, name: awsSecretName })).toBeDefined()
    })

    it('should return getSecretBinding', () => {
      expect(credentialStore.getSecretBinding({ namespace: testNamespace, name: awsSecretBindingName })).toBeDefined()
    })

    it('should fetchCredentials', async () => {
      credentialStore.$reset()
      expect(credentialStore.secretBindingList.length).toBe(0)
      await credentialStore.fetchCredentials()
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
      expect(api.getCloudProviderCredentials).toBeCalledWith({ namespace: testNamespace })
      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
    })

    it('should updateCredential', async () => {
      const name = awsSecretBindingName
      const secretStringData = { newSecret: 'supersecret2' }
      await credentialStore.updateCredential({ name, secretStringData })

      expect(api.updateCloudProviderCredential).toBeCalledTimes(1)
      expect(api.updateCloudProviderCredential).toBeCalledWith({ name, namespace: testNamespace, params: { secretStringData } })
      const awsSecretBinding = find(credentialStore.secretBindingList, { metadata: { name } })
      expect(awsSecretBinding._secret.data).toEqual({ newSecret: 'c3VwZXJzZWNyZXQy' })
    })

    it('should createCredential', async () => {
      const secretStringData = { newSecret: 'supersecret3' }
      const name = 'my-new-secret'
      const namespace = testNamespace
      const providerType = 'aws'
      await credentialStore.createCredential({ name, providerType, secretStringData })

      expect(api.createCloudProviderCredential).toBeCalledTimes(1)
      expect(api.createCloudProviderCredential).toBeCalledWith({ name, namespace, params: { providerType, secretStringData } })
      const newSecretBinding = find(credentialStore.secretBindingList, { metadata: { name } })
      expect(newSecretBinding.metadata.namespace).toEqual(namespace)
      expect(newSecretBinding.provider.type).toEqual(providerType)
      expect(newSecretBinding._secret.data).toEqual({ newSecret: 'c3VwZXJzZWNyZXQz' })
    })

    it('should deleteCredential secretbinding and referenced secret / quota', async () => {
      const name = azureSecretBindingName
      const namespace = testNamespace

      let azureSecretBinding = find(credentialStore.secretBindingList, { metadata: { namespace, name } })
      expect(azureSecretBinding).toBeDefined()

      const azureSecretRef = azureSecretBinding.secretRef
      let azureSecret = find(credentialStore.secretList, { metadata: azureSecretRef })
      expect(azureSecret).toBeDefined()

      const azureQuotaRef1 = azureSecretBinding.quotas[0]
      let azureQuota1 = find(credentialStore.quotaList, { metadata: azureQuotaRef1 })
      expect(azureQuota1).toBeDefined()

      const azureQuotaRef2 = azureSecretBinding.quotas[1]
      let azureQuota2 = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota2).toBeDefined()

      await credentialStore.deleteCredential(name)

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ name, namespace })

      azureSecretBinding = find(credentialStore.secretBindingList, { metadata: { namespace, name } })
      expect(azureSecretBinding).toBeUndefined()

      azureSecret = find(credentialStore.secretList, { metadata: azureSecretRef })
      expect(azureSecret).toBeUndefined()

      azureQuota1 = find(credentialStore.quotaList, { metadata: azureQuotaRef1 })
      expect(azureQuota1).toBeUndefined()

      azureQuota2 = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota2).toBeUndefined()
    })

    it('should not delete secret or quota if referenced by other SecretBinding', async () => {
      const name = azureSecretBindingName
      const namespace = testNamespace

      let azureSecretBinding = find(credentialStore.secretBindingList, { metadata: { namespace, name } })
      expect(azureSecretBinding).toBeDefined()

      const azureSecretRef = azureSecretBinding.secretRef
      const azureQuotaRef1 = azureSecretBinding.quotas[0]
      const azureQuotaRef2 = azureSecretBinding.quotas[1]

      // Add another SecretBinding that references the same secret and quota
      const otherSecretBinding = {
        metadata: {
          namespace,
          name: 'other-secretbinding',
        },
        provider: {
          type: 'azure',
        },
        secretRef: azureSecretRef,
        quotas: [azureQuotaRef1],
      }
      const { secretBindings, secrets, quotas } = fixtures.credentials
      secretBindings.push(otherSecretBinding)
      credentialStore.setCredentials({ secretBindings, secrets, quotas })

      let azureSecret = find(credentialStore.secretList, { metadata: azureSecretRef })
      expect(azureSecret).toBeDefined()

      let azureQuota1 = find(credentialStore.quotaList, { metadata: azureQuotaRef1 })
      expect(azureQuota1).toBeDefined()

      let azureQuota2 = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota2).toBeDefined()

      await credentialStore.deleteCredential(name)

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ name, namespace })

      azureSecretBinding = find(credentialStore.secretBindingList, { metadata: { namespace, name } })
      expect(azureSecretBinding).toBeUndefined()

      azureSecret = find(credentialStore.secretList, { metadata: azureSecretRef })
      expect(azureSecret).toBeDefined() // still referenced by otherSecretBinding

      azureQuota1 = find(credentialStore.quotaList, { metadata: azureQuotaRef1 })
      expect(azureQuota1).toBeDefined() // still referenced by otherSecretBinding

      azureQuota2 = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota2).toBeUndefined() // not referenced anymore
    })

    it('store should be resetted in case of a fetch error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
      await expect(credentialStore.fetchCredentials()).rejects.toThrow(Error)
      expect(credentialStore.secretBindingList.length).toBe(0)
    })

    it('store should be resetted in case of a create error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
      await expect(credentialStore.createCredential({ name: 'foo' })).rejects.toThrow(Error)
      expect(credentialStore.secretBindingList.length).toBe(0)
    })

    it('store should be resetted in case of an update error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
      await expect(credentialStore.updateCredential({ name: 'foo' })).rejects.toThrow(Error)
      expect(credentialStore.secretBindingList.length).toBe(0)
    })

    it('store should be resetted in case of a delete error', async () => {
      const namespace = 'invalid'
      authzStore.setNamespace(namespace)

      expect(credentialStore.secretBindingList.length).toBeGreaterThan(0)
      await expect(credentialStore.deleteCredential(awsTrialSecretBindingName)).rejects.toThrow(Error)
      expect(credentialStore.secretBindingList.length).toBe(0)
    })
  })
})
