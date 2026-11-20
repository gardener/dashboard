//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
const newWorkloadIdentity = {
  apiVersion: 'security.gardener.cloud/v1alpha1',
  kind: 'WorkloadIdentity',
  metadata: {
    name: 'my-new-workload-identity',
    namespace: testNamespace,
    uid: 'new-wlid-uid',
    resourceVersion: '42',
  },
  spec: {
    audiences: ['audience'],
    targetSystem: { type: 'aws' },
  },
  status: { sub: 'gardener.cloud:workloadidentity:garden-test:my-new-workload-identity:new-wlid-uid' },
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
      vi.spyOn(api, 'updateDnsProviderCredential').mockImplementation(params => ({ data: params }))
      vi.spyOn(api, 'updateInfraProviderCredential').mockImplementation(params => ({ data: params }))
      vi.spyOn(api, 'createDnsProviderCredential').mockImplementation(params => ({ data: params }))
      vi.spyOn(api, 'createInfraProviderCredential').mockImplementation(params => ({ data: params }))
      vi.spyOn(api, 'deleteDnsProviderCredential').mockReturnValue()
      vi.spyOn(api, 'deleteInfraProviderCredential').mockReturnValue()
      appStore = useAppStore()
      vi.spyOn(appStore, 'setSuccess')
      vi.spyOn(appStore, 'setError')
      authzStore = useAuthzStore()
      authzStore._setNamespace(testNamespace)
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.list = fixtures.cloudprofiles
      gardenerExtensionStore = useGardenerExtensionStore()
      gardenerExtensionStore.list = fixtures.gardenerExtensions
      credentialStore = useCredentialStore()
      credentialStore._setCredentials(fixtures.credentials)
    })

    afterEach(() => {
      appStore.setSuccess.mockClear()
      appStore.setError.mockClear()
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

    it('stores a returned WorkloadIdentity separately from same-name Secrets', async () => {
      const workloadIdentity = {
        ...newWorkloadIdentity,
        metadata: {
          ...newWorkloadIdentity.metadata,
          labels: { 'dashboard.gardener.cloud/dnsProviderType': 'aws-route53' },
        },
      }
      const sameNameSecret = {
        ...newSecret,
        metadata: { ...newSecret.metadata, name: workloadIdentity.metadata.name },
      }
      credentialStore._setCredentials({
        ...fixtures.credentials,
        secrets: [...fixtures.credentials.secrets, sameNameSecret],
      })

      const result = await credentialStore.createDnsCredential({ workloadIdentity })

      expect(api.createDnsProviderCredential).toHaveBeenCalledWith({ workloadIdentity })
      expect(result.status.sub).toContain('new-wlid-uid')
      expect(credentialStore.getWorkloadIdentity(workloadIdentity.metadata)).toEqual(workloadIdentity)
      expect(credentialStore.getSecret(sameNameSecret.metadata)).toEqual(sameNameSecret)
    })

    it('preserves the deletion error when refreshing credentials also fails', async () => {
      const deletionError = new Error('credential deletion was requested but binding cleanup failed')
      api.deleteInfraProviderCredential.mockRejectedValueOnce(deletionError)
      api.getCloudProviderCredentials.mockRejectedValueOnce(new Error('refresh failed'))

      await expect(credentialStore.deleteInfraCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: 'binding' })).rejects.toBe(deletionError)
    })

    it('should delete credential (secretbinding)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'SecretBinding', bindingNamespace: testNamespace, bindingName: awsSecretBindingName, preserveCredential: false })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('should delete credential (credentialsbinding/secret)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsCredentialsBindingName, preserveCredential: false })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it('sends binding-only deletion and reports a preserved Secret accurately', async () => {
      api.deleteInfraProviderCredential.mockResolvedValue({
        data: {
          credentialRef: { kind: 'Secret', name: 'aws-secret' },
          credentialDeletionRequested: false,
          credentialMissing: false,
          credentialPreserved: true,
          credentialPreservedReason: 'Only binding deletion was requested',
        },
      })

      await credentialStore.deleteInfraCredential({
        bindingKind: 'CredentialsBinding',
        bindingNamespace: testNamespace,
        bindingName: awsCredentialsBindingName,
        preserveCredential: true,
      })

      expect(api.deleteInfraProviderCredential).toHaveBeenCalledWith({
        bindingKind: 'CredentialsBinding',
        bindingNamespace: testNamespace,
        bindingName: awsCredentialsBindingName,
        preserveCredential: true,
      })
      expect(appStore.setSuccess).toHaveBeenCalledWith(`Deletion of CredentialsBinding ${awsCredentialsBindingName} was requested. Secret aws-secret was preserved`)
      expect(appStore.setSuccess).not.toHaveBeenCalledWith(expect.stringContaining('Secret and CredentialsBinding'))
    })

    it.each([
      [
        {
          credentialRef: { kind: 'Secret', name: 'aws-secret' },
          credentialDeletionRequested: true,
          credentialMissing: false,
          credentialPreserved: false,
        },
        `Deletion of Secret aws-secret and CredentialsBinding ${awsCredentialsBindingName} was requested`,
      ],
      [
        {
          credentialRef: { kind: 'Secret', name: 'aws-secret' },
          credentialDeletionRequested: false,
          credentialMissing: true,
          credentialPreserved: false,
        },
        `Deletion of CredentialsBinding ${awsCredentialsBindingName} was requested. Secret aws-secret was already missing`,
      ],
    ])('reports structured infrastructure deletion outcomes', async (data, message) => {
      api.deleteInfraProviderCredential.mockResolvedValue({ data })

      await credentialStore.deleteInfraCredential({
        bindingKind: 'CredentialsBinding',
        bindingNamespace: testNamespace,
        bindingName: awsCredentialsBindingName,
      })

      expect(appStore.setSuccess).toHaveBeenCalledWith(message)
    })

    it('reports an unconfirmed credential deletion even when refreshing credentials fails', async () => {
      const data = {
        credentialRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace: testNamespace,
          name: 'aws-secret',
        },
        credentialDeletionRequested: false,
        credentialMissing: false,
        credentialPreserved: false,
        credentialDeletionUnconfirmed: true,
        credentialDeletionError: 'apiserver unavailable',
      }
      api.deleteInfraProviderCredential.mockResolvedValue({ data })
      api.getCloudProviderCredentials.mockRejectedValueOnce(new Error('refresh failed'))

      await expect(credentialStore.deleteInfraCredential({
        bindingKind: 'CredentialsBinding',
        bindingNamespace: testNamespace,
        bindingName: awsCredentialsBindingName,
      })).resolves.toBe(data)

      expect(appStore.setError).toHaveBeenCalledWith({
        title: `Deletion of CredentialsBinding ${awsCredentialsBindingName} was requested`,
        text: `Secret aws-secret deletion could not be confirmed. Verify ${testNamespace}/aws-secret before retrying manually. Details: apiserver unavailable`,
      })
      expect(appStore.setSuccess).not.toHaveBeenCalled()
    })

    it('refreshes after a failed deletion without hiding the original error', async () => {
      const error = new Error('deletion failed')
      api.deleteInfraProviderCredential.mockRejectedValue(error)

      await expect(credentialStore.deleteInfraCredential({
        bindingKind: 'CredentialsBinding',
        bindingNamespace: testNamespace,
        bindingName: awsCredentialsBindingName,
      })).rejects.toBe(error)

      expect(api.getCloudProviderCredentials).toHaveBeenCalledTimes(1)
      expect(appStore.setSuccess).not.toHaveBeenCalled()
    })

    it('should delete credential (credentialsbinding/workloadidentity)', async () => {
      await credentialStore.deleteInfraCredential({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsWlidCredentialsBindingName })

      expect(api.deleteInfraProviderCredential).toBeCalledTimes(1)
      expect(api.deleteInfraProviderCredential).toBeCalledWith({ bindingKind: 'CredentialsBinding', bindingNamespace: testNamespace, bindingName: awsWlidCredentialsBindingName, preserveCredential: false })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
    })

    it.each([
      ['Secret', 'aws-route53-secret', 'DNS Provider Secret aws-route53-secret deleted'],
      ['WorkloadIdentity', 'aws-route53-identity', 'DNS Provider Workload Identity aws-route53-identity deleted'],
    ])('should delete DNS credential (%s)', async (credentialKind, credentialName, successMessage) => {
      await credentialStore.deleteDnsCredential({ credentialKind, credentialNamespace: testNamespace, credentialName })

      expect(api.deleteDnsProviderCredential).toBeCalledTimes(1)
      expect(api.deleteDnsProviderCredential).toBeCalledWith({ credentialKind, credentialNamespace: testNamespace, credentialName })
      expect(api.getCloudProviderCredentials).toBeCalledTimes(1)
      expect(appStore.setSuccess).toHaveBeenCalledWith(successMessage)
    })

    it('store should be resetted in case of a fetch error', async () => {
      const namespace = 'invalid'
      authzStore._setNamespace(namespace)

      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
      await expect(credentialStore.fetchCredentials()).rejects.toThrow(Error)
      expect(credentialStore.infrastructureBindingList.length).toBe(0)
      expect(credentialStore.dnsCredentialList.length).toBe(0)
    })
    it('store should be resetted after setting new data', async () => {
      const namespace = 'invalid'
      authzStore._setNamespace(namespace)

      expect(credentialStore.infrastructureBindingList.length).toBeGreaterThan(0)
      expect(credentialStore.dnsCredentialList.length).toBeGreaterThan(0)
      credentialStore._setCredentials({})
      expect(credentialStore.infrastructureBindingList.length).toBe(0)
      expect(credentialStore.dnsCredentialList.length).toBe(0)
    })
  })
})
