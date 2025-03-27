//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { reactive } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'

import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'

describe('composables', () => {
  describe('useSecretContext', () => {
    const testNamespace = 'garden-foo'
    let credentialsBindingContext

    beforeEach(() => {
      setActivePinia(createPinia())
      const authzStore = useAuthzStore()
      authzStore.setNamespace(testNamespace)

      const composable = useCredentialsBindingContext()
      credentialsBindingContext = reactive(composable)
    })

    it('should set CredentialsBinding manifest', () => {
      const manifest = {
        metadata: {
          name: 'foo',
          namespace: testNamespace,
        },
        provider: {
          type: 'aws',
        },
      }
      credentialsBindingContext.setBindingManifest(manifest)

      expect(credentialsBindingContext.bindingName).toBe('foo')
      expect(credentialsBindingContext.bindingNamespace).toBe(testNamespace)
      expect(credentialsBindingContext.bindingProviderType).toBe('aws')
      expect(credentialsBindingContext.bindingManifest).toMatchSnapshot()
    })

    it('should create a new CredentialsBinding manifest with defaults', () => {
      credentialsBindingContext.createBindingManifest()
      expect(credentialsBindingContext.bindingName).toBe('')
      expect(credentialsBindingContext.bindingNamespace).toBe(testNamespace)
      expect(credentialsBindingContext.bindingProviderType).toBe('')
      expect(credentialsBindingContext.bindingManifest).toMatchSnapshot()
    })

    it('should detect dirty state in CredentialsBinding', () => {
      credentialsBindingContext.createBindingManifest()
      expect(credentialsBindingContext.isBindingDirty).toBe(false)
      credentialsBindingContext.bindingProviderType = 'gcp'
      expect(credentialsBindingContext.isBindingDirty).toBe(true)
    })

    it('should update CredentialsBinding provider type and secretRef', () => {
      credentialsBindingContext.createBindingManifest()
      credentialsBindingContext.bindingProviderType = 'azure'
      expect(credentialsBindingContext.bindingProviderType).toBe('azure')

      credentialsBindingContext.bindingRef = { name: 'my-secret-ref', namespace: 'other-namespace' }
      expect(credentialsBindingContext.bindingManifest.credentialsRef).toEqual(
        expect.objectContaining({ name: 'my-secret-ref', namespace: 'other-namespace' }),
      )
    })
  })
})
