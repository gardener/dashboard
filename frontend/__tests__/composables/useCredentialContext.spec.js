//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  reactive,
  nextTick,
} from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'

import { createCredentialContextComposable } from '@/composables/useCredentialContext'

import { encodeBase64 } from '@/utils'

describe('composables', () => {
  describe('useCredentialContext', () => {
    const testNamespace = 'garden-foo'
    let credentialContext

    beforeEach(() => {
      setActivePinia(createPinia())
      const authzStore = useAuthzStore()
      authzStore.setNamespace(testNamespace)

      const composable = createCredentialContextComposable()
      credentialContext = reactive(composable)
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
      credentialContext.setSecretBindingManifest(manifest)

      expect(credentialContext.secretBindingName).toBe('foo')
      expect(credentialContext.bindingNamespace).toBe(testNamespace)
      expect(credentialContext.secretBindingProviderType).toBe('aws')
      expect(credentialContext.secretBindingManifest).toMatchSnapshot()
    })

    it('should create a new SecretBinding manifest with defaults', () => {
      credentialContext.createSecretBindingManifest()
      expect(credentialContext.secretBindingName).toBe('')
      expect(credentialContext.bindingNamespace).toBe(testNamespace)
      expect(credentialContext.secretBindingProviderType).toBe('')
      expect(credentialContext.secretBindingManifest).toMatchSnapshot()
    })

    it('should detect dirty state in SecretBinding', () => {
      credentialContext.createSecretBindingManifest()
      expect(credentialContext.isSecretBindingDirty).toBe(false)
      credentialContext.secretBindingProviderType = 'gcp'
      expect(credentialContext.isSecretBindingDirty).toBe(true)
    })

    it('should set and create Secret manifest', () => {
      const secretManifest = {
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          foo: 'dummy-data',
        },
      }
      credentialContext.setSecretManifest(secretManifest)
      expect(credentialContext.secretName).toBe('my-secret')
      expect(credentialContext.secretData).toEqual({ foo: 'dummy-data' })

      credentialContext.createSecretManifest()
      expect(credentialContext.secretName).toBe('')
      expect(credentialContext.secretData).toEqual({})
    })

    it('should detect dirty state in Secret', () => {
      credentialContext.createSecretManifest()
      expect(credentialContext.isSecretDirty).toBe(false)
      credentialContext.secretName = 'changed-secret'
      expect(credentialContext.isSecretDirty).toBe(true)
    })

    it('should update secretStringDataRefs via secretData', async () => {
      credentialContext.createSecretManifest()

      const keyMapping = { password: 'pwdVar', token: 'tokenVar' }
      const refs = credentialContext.secretStringDataRefs(keyMapping)

      await nextTick()
      expect(refs.pwdVar.value).toBe('')
      expect(refs.tokenVar.value).toBe('')

      const password = encodeBase64('mypassword')
      const token = encodeBase64('mytoken')

      credentialContext.secretData = { password, token }

      await nextTick()
      expect(refs.pwdVar.value).toBe('mypassword')
      expect(refs.tokenVar.value).toBe('mytoken')
    })

    it('should update secretData via secretStringDataRefs', async () => {
      credentialContext.setSecretManifest({
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          password: encodeBase64('initial'),
        },
      })

      const keyMapping = { password: 'pwdVar', token: 'tokenVar' }
      const refs = credentialContext.secretStringDataRefs(keyMapping)

      await nextTick()
      expect(refs.pwdVar.value).toBe('initial')

      refs.pwdVar.value = 'mypassword'
      refs.tokenVar.value = 'mytoken'

      await nextTick()
      expect(credentialContext.secretData).toEqual({
        password: encodeBase64('mypassword'),
        token: encodeBase64('mytoken'),
      })
    })

    it('should update SecretBinding provider type and secretRef', () => {
      credentialContext.createSecretBindingManifest()
      credentialContext.secretBindingProviderType = 'azure'
      expect(credentialContext.secretBindingProviderType).toBe('azure')

      credentialContext.secretBindingSecretRef = { name: 'my-secret-ref', namespace: 'other-namespace' }
      expect(credentialContext.secretBindingSecretRef).toEqual({ name: 'my-secret-ref', namespace: 'other-namespace' })
    })
  })
})
