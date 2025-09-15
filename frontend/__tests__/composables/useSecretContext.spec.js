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

import { createSecretContextComposable } from '@/composables/credential/useSecretContext'

import { encodeBase64 } from '@/utils'

describe('composables', () => {
  describe('useSecretContext', () => {
    const testNamespace = 'garden-foo'
    let secretContext

    beforeEach(() => {
      setActivePinia(createPinia())
      const authzStore = useAuthzStore()
      authzStore.setNamespace(testNamespace)

      const composable = createSecretContextComposable()
      secretContext = reactive(composable)
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
      secretContext.setSecretManifest(secretManifest)
      expect(secretContext.secretName).toBe('my-secret')
      expect(secretContext.secretData).toEqual({ foo: 'dummy-data' })

      secretContext.createSecretManifest()
      expect(secretContext.secretName).toBe('')
      expect(secretContext.secretData).toEqual({})
    })

    it('should detect dirty state in Secret', () => {
      secretContext.createSecretManifest()
      expect(secretContext.isSecretDirty).toBe(false)
      secretContext.secretName = 'changed-secret'
      expect(secretContext.isSecretDirty).toBe(true)
    })

    it('should update secretStringDataRefs via secretData', async () => {
      secretContext.createSecretManifest()

      const keyMapping = { password: 'pwdVar', token: 'tokenVar' }
      const refs = secretContext.secretStringDataRefs(keyMapping)

      await nextTick()
      expect(refs.pwdVar.value).toBe('')
      expect(refs.tokenVar.value).toBe('')

      const password = encodeBase64('mypassword')
      const token = encodeBase64('mytoken')

      secretContext.secretData = { password, token }

      await nextTick()
      expect(refs.pwdVar.value).toBe('mypassword')
      expect(refs.tokenVar.value).toBe('mytoken')
    })

    it('should update secretData via secretStringDataRefs', async () => {
      secretContext.setSecretManifest({
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          password: encodeBase64('initial'),
        },
      })

      const keyMapping = { password: 'pwdVar', token: 'tokenVar' }
      const refs = secretContext.secretStringDataRefs(keyMapping)

      await nextTick()
      expect(refs.pwdVar.value).toBe('initial')

      refs.pwdVar.value = 'mypassword'
      refs.tokenVar.value = 'mytoken'

      await nextTick()
      expect(secretContext.secretData).toEqual({
        password: encodeBase64('mypassword'),
        token: encodeBase64('mytoken'),
      })
    })

    it('should update secretData vis secretStringData, null values shall not be encoded', async () => {
      secretContext.setSecretManifest({
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          password: encodeBase64('initial'),
        },
      })

      secretContext.secretStringData = {
        password: 'mypassword',
        token: null,
      }

      expect(secretContext.secretData).toEqual({
        password: encodeBase64('mypassword'),
        token: undefined,
      })
    })

    describe('secretProviderType', () => {
      it('should get and set provider type correctly', () => {
        secretContext.setSecretManifest({
          metadata: {
            name: 'my-secret',
            namespace: testNamespace,
            labels: {
              'provider.shoot.gardener.cloud/aws': 'true',
              'other.label': 'value',
            },
          },
          data: {},
        })

        // Test getter - should extract provider type from label key
        expect(secretContext.secretProviderType).toBe('aws')

        // Test setter - should set new provider type
        secretContext.secretProviderType = 'gcp'
        expect(secretContext.secretManifest.metadata.labels).toEqual({
          'provider.shoot.gardener.cloud/aws': 'true',
          'other.label': 'value',
          'provider.shoot.gardener.cloud/gcp': 'true',
        })
        expect(secretContext.secretProviderType).toBe('aws') // Should return first match
      })

      it('should return undefined when no provider label exists', () => {
        secretContext.setSecretManifest({
          metadata: {
            name: 'my-secret',
            namespace: testNamespace,
            labels: {
              'other.label': 'value',
            },
          },
          data: {},
        })

        expect(secretContext.secretProviderType).toBeUndefined()
      })
    })
  })
})
