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
const awsSecretName = 'aws-secret'
const awsWorkloadIndentityName = 'aws-wlid'
const awsTrialSecretBindingName = 'aws-trial-secretbinding'
const awsTrialCredentialsBindingName = 'aws-trial-credentialsbinding'
const azureSecretBindingName = 'azure-secretbinding'
const azureCredentialsBindingName = 'azure-credentialsbinding'
const awsWorkloadIdentitiyCredentialsBindingName = 'aws-wlid-credentialsbinding'
const azureDnsSecretBindingName = 'azure-dns-secretbinding'
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

    it('should return cloudProviderBindingList with resolved secret (secretbinding)', () => {
      const awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      expect(awsSecretBinding.secretRef.name).toBe(awsSecretBinding._secret.metadata.name)
      expect(awsSecretBinding.secretRef.namespace).toBe(awsSecretBinding._secret.metadata.namespace)
    })

    it('should return cloudProviderBindingList with resolved secret (credentialsbinding)', () => {
      const awsCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsCredentialsBindingName } })
      expect(awsCredentialsBinding.credentialsRef.name).toBe(awsCredentialsBinding._secret.metadata.name)
      expect(awsCredentialsBinding.credentialsRef.namespace).toBe(awsCredentialsBinding._secret.metadata.namespace)
    })

    it('should return cloudProviderBindingList with trial quota and secret from other namespace (secretbinding)', () => {
      const awsTrialSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsTrialSecretBindingName } })
      expect(awsTrialSecretBinding._secret).toBeUndefined()
      expect(awsTrialSecretBinding.secretRef.namespace).toBe(awsTrialSecretBinding._quotas[0].metadata.namespace)
    })

    it('should return cloudProviderBindingList with trial quota and secret from other namespace (credentialsbinding)', () => {
      const awsTrialCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsTrialCredentialsBindingName } })
      expect(awsTrialCredentialsBinding._secret).toBeUndefined()
      expect(awsTrialCredentialsBinding.credentialsRef.namespace).toBe(awsTrialCredentialsBinding._quotas[0].metadata.namespace)
    })

    it('should return cloudProviderBindingList with multiple quotas (secretbinding)', () => {
      const azureSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: azureSecretBindingName } })
      expect(azureSecretBinding._secret).toMatchSnapshot()
      expect(azureSecretBinding._quotas.length).toBe(2)
      const azureQuotaRef2 = azureSecretBinding.quotas[1]
      const azureQuota = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota).toMatchSnapshot()
    })

    it('should return cloudProviderBindingList with multiple quotas (credentialsbinding)', () => {
      const azureCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: azureCredentialsBindingName } })
      expect(azureCredentialsBinding._secret).toMatchSnapshot()
      expect(azureCredentialsBinding._quotas.length).toBe(2)
      const azureQuotaRef2 = azureCredentialsBinding.quotas[1]
      const azureQuota = find(credentialStore.quotaList, { metadata: azureQuotaRef2 })
      expect(azureQuota).toMatchSnapshot()
    })

    it('should return cloudProviderBindingList with resolved workloadidentity (credentialsbinding)', () => {
      const awsWorkloadIdentityCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsWorkloadIdentitiyCredentialsBindingName } })
      expect(awsWorkloadIdentityCredentialsBinding.credentialsRef.name).toBe(awsWorkloadIdentityCredentialsBinding._workloadIdentity.metadata.name)
      expect(awsWorkloadIdentityCredentialsBinding.credentialsRef.namespace).toBe(awsWorkloadIdentityCredentialsBinding._workloadIdentity.metadata.namespace)
    })

    it('should return cloudProviderBindingList with resolved additional props (dns secretbinding)', () => {
      const awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: azureDnsSecretBindingName } })
      const descriptors = Object.getOwnPropertyDescriptors(awsSecretBinding)
      expect(descriptors).toMatchSnapshot()
    })

    it('should return cloudProviderBindingList with resolved additional props (infra credentialsbinding)', () => {
      const awsCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsCredentialsBindingName } })
      const descriptors = Object.getOwnPropertyDescriptors(awsCredentialsBinding)
      expect(descriptors).toMatchSnapshot()
    })

    it('should return infrastructureBindingList', () => {
      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(credentialStore.infrastructureBindingList.length)
      expect(cloudProfileStore.sortedProviderTypeList).toMatchSnapshot()
    })

    it('should return dnsBindingList', () => {
      expect(credentialStore.dnsBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(credentialStore.dnsBindingList.length)
      expect(gardenerExtensionStore.dnsProviderTypes).toMatchSnapshot()
    })

    it('should return secret', () => {
      expect(credentialStore.getSecret({ namespace: testNamespace, name: awsSecretName })).toMatchSnapshot()
    })

    it('should return workloadIdentity', () => {
      expect(credentialStore.getWorkloadIdentity({ namespace: testNamespace, name: awsWorkloadIndentityName })).toMatchSnapshot()
    })

    it('should return secretBinding', () => {
      expect(credentialStore.getSecretBinding({ namespace: testNamespace, name: awsSecretBindingName })).toMatchSnapshot()
    })

    it('should return credentialsBinding', () => {
      expect(credentialStore.getCredentialsBinding({ namespace: testNamespace, name: awsCredentialsBindingName })).toMatchSnapshot()
    })

    it('should fetchCredentials', async () => {
      credentialStore.$reset()
      expect(credentialStore.cloudProviderBindingList.length).toBe(0)
      await credentialStore.fetchCredentials()
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
      expect(api.getCloudProviderCredentials).toBeCalledWith(testNamespace)
      expect(credentialStore.cloudProviderBindingList.length).toBeGreaterThan(0)
    })

    it('should update credential (secretbinding)', async () => {
      let awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      const secret = {
        ...awsSecretBinding._secret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateCredential({ binding: awsSecretBinding, secret })

      expect(api.updateCloudProviderCredential).toBeCalledTimes(1)
      expect(api.updateCloudProviderCredential).toBeCalledWith({ binding: awsSecretBinding, secret })
      awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      expect(awsSecretBinding._secret.data).toEqual({ newSecret2: 'dummy-data' })
    })

    it('should update credential (credentialsbinding)', async () => {
      let awsCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsCredentialsBindingName } })
      const secret = {
        ...awsCredentialsBinding._secret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateCredential({ binding: awsCredentialsBinding, secret })

      expect(api.updateCloudProviderCredential).toBeCalledTimes(1)
      expect(api.updateCloudProviderCredential).toBeCalledWith({ binding: awsCredentialsBinding, secret })
      awsCredentialsBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsCredentialsBindingName } })
      expect(awsCredentialsBinding._secret.data).toEqual({ newSecret2: 'dummy-data' })
    })

    it('should create credential (secretbinding)', async () => {
      const secret = newSecret
      const binding = {
        apiVersion: 'core.gardener.cloud/v1beta1',
        kind: 'SecretBinding',
        metadata: {
          namespace: testNamespace,
          name: 'my-new-secret-binding',
        },
        provider: {
          type: 'aws',
        },
        secretRef: {
          namespace: testNamespace,
          name: 'my-new-secret',
        },
      }

      await credentialStore.createCredential({ binding, secret })

      expect(api.createCloudProviderCredential).toBeCalledTimes(1)
      expect(api.createCloudProviderCredential).toBeCalledWith({ binding, secret })
      const newSecretBinding = find(credentialStore.cloudProviderBindingList, { kind: 'SecretBinding', metadata: binding.metadata })
      expect(newSecretBinding.metadata.namespace).toEqual(testNamespace)
      expect(newSecretBinding.provider.type).toEqual('aws')
      expect(newSecretBinding._secret.data).toEqual({ newSecret: 'dummy-data' })
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
      expect(newCredentialsBinding._secret.data).toEqual({ newSecret: 'dummy-data' })
    })

    it('should delete credential', async () => {
      await credentialStore.deleteCredential({ namespace: testNamespace, secretBindingName: awsSecretBindingName, credentialsBindingName: awsCredentialsBindingName, secretName: awsSecretName })

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ namespace: testNamespace, secretBindingName: awsSecretBindingName, credentialsBindingName: awsCredentialsBindingName, secretName: awsSecretName })
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

    it('store should return all bindings for a specified secret', async () => {
      const awsSecret = find(fixtures.credentials.secrets, { metadata: { name: awsSecretName } })
      expect(credentialStore.bindingsForSecret(awsSecret.metadata.uid).length).toBe(2)
    })
  })
})
