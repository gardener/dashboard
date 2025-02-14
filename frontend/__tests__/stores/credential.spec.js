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
      vi.spyOn(api, 'updateCloudProviderCredential').mockImplementation(({ secretBinding, secret }) => {
        return {
          data: {
            secretBinding,
            secret,
          },
        }
      })
      vi.spyOn(api, 'createCloudProviderCredential').mockImplementation(({ secretBinding, secret }) => {
        return {
          data: {
            secretBinding,
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

    it('should updateCredential', async () => {
      let awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      const secret = {
        ...awsSecretBinding._secret,
        data: {
          newSecret2: 'dummy-data',
        },
      }
      await credentialStore.updateCredential({ secretBinding: awsSecretBinding, secret })

      expect(api.updateCloudProviderCredential).toBeCalledTimes(1)
      expect(api.updateCloudProviderCredential).toBeCalledWith({ secretBinding: awsSecretBinding, secret })
      awsSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: { name: awsSecretBindingName } })
      expect(awsSecretBinding._secret.data).toEqual({ newSecret2: 'dummy-data' })
    })

    it('should createCredential', async () => {
      const secretBinding = {
        apiVersion: 'core.gardener.cloud/v1alpha1',
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
      const secret = {
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

      await credentialStore.createCredential({ secretBinding, secret })

      expect(api.createCloudProviderCredential).toBeCalledTimes(1)
      expect(api.createCloudProviderCredential).toBeCalledWith({ secretBinding, secret })
      const newSecretBinding = find(credentialStore.cloudProviderBindingList, { metadata: secretBinding.metadata })
      expect(newSecretBinding.metadata.namespace).toEqual(testNamespace)
      expect(newSecretBinding.provider.type).toEqual('aws')
      expect(newSecretBinding._secret.data).toEqual({ newSecret: 'dummy-data' })
    })

    it('should not delete credential', async () => {
      const name = azureSecretBindingName
      const namespace = testNamespace

      await credentialStore.deleteCredential(name)

      expect(api.deleteCloudProviderCredential).toBeCalledTimes(1)
      expect(api.deleteCloudProviderCredential).toBeCalledWith({ name, namespace })
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
