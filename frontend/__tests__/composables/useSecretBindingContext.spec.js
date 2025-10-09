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

import { useSecretBindingContext } from '@/composables/credential/useSecretBindingContext'

describe('composables', () => {
  describe('useSecretContext', () => {
    const testNamespace = 'garden-foo'
    let secretBindingContext

    beforeEach(() => {
      setActivePinia(createPinia())
      const authzStore = useAuthzStore()
      authzStore.setNamespace(testNamespace)

      const composable = useSecretBindingContext()
      secretBindingContext = reactive(composable)
    })

    it('should set SecretBinding manifest', () => {
      const manifest = {
        metadata: {
          name: 'foo',
          namespace: testNamespace,
        },
        provider: {
          type: 'aws',
        },
      }
      secretBindingContext.setBindingManifest(manifest)

      expect(secretBindingContext.bindingName).toBe('foo')
      expect(secretBindingContext.bindingNamespace).toBe(testNamespace)
      expect(secretBindingContext.bindingProviderType).toBe('aws')
      expect(secretBindingContext.bindingManifest).toMatchSnapshot()
    })

    it('should create a new SecretBinding manifest with defaults', () => {
      secretBindingContext.createBindingManifest()
      expect(secretBindingContext.bindingName).toBe('')
      expect(secretBindingContext.bindingNamespace).toBe(testNamespace)
      expect(secretBindingContext.bindingProviderType).toBe('')
      expect(secretBindingContext.bindingManifest).toMatchSnapshot()
    })

    it('should detect dirty state in SecretBinding', () => {
      secretBindingContext.createBindingManifest()
      expect(secretBindingContext.isBindingDirty).toBe(false)
      secretBindingContext.bindingProviderType = 'gcp'
      expect(secretBindingContext.isBindingDirty).toBe(true)
    })

    it('should update SecretBinding provider type and secretRef', () => {
      secretBindingContext.createBindingManifest()
      secretBindingContext.bindingProviderType = 'azure'
      expect(secretBindingContext.bindingProviderType).toBe('azure')

      secretBindingContext.bindingRef = { name: 'my-secret-ref', namespace: 'other-namespace' }
      expect(secretBindingContext.bindingManifest.secretRef).toEqual({ name: 'my-secret-ref', namespace: 'other-namespace' })
    })
  })
})
