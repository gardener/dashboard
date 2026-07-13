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

import {
  decodeBase64,
  encodeBase64,
} from '@/utils'

describe('composables', () => {
  describe('useSecretContext', () => {
    const testNamespace = 'garden-foo'
    let secretContext

    beforeEach(() => {
      setActivePinia(createPinia())
      const authzStore = useAuthzStore()
      authzStore._setNamespace(testNamespace)

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

    it('should preserve decoded values as strings in secretStringData', () => {
      secretContext.setSecretManifest({
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          zero: encodeBase64('0'),
          bool: encodeBase64('false'),
          nullValue: encodeBase64('null'),
          empty: encodeBase64(''),
          object: encodeBase64('{"enabled":true}'),
          array: encodeBase64('[1,2,3]'),
        },
      })

      expect(secretContext.secretStringData).toEqual({
        zero: '0',
        bool: 'false',
        nullValue: 'null',
        empty: '',
        object: '{"enabled":true}',
        array: '[1,2,3]',
      })
    })

    it('should parse only configured structured fields', () => {
      secretContext.setSecretManifest({
        metadata: {
          name: 'my-secret',
          namespace: testNamespace,
        },
        data: {
          plainJson: encodeBase64('{"enabled":true}'),
          serviceAccount: encodeBase64('{"project_id":"example","type":"service_account"}'),
          yamlConfig: encodeBase64('enabled: true\n'),
          invalidJson: encodeBase64('{"broken":'),
        },
      })

      const fields = [
        { key: 'plainJson', type: 'text' },
        { key: 'serviceAccount', type: 'json-secret' },
        { key: 'yamlConfig', type: 'yaml-secret' },
        { key: 'invalidJson', type: 'json-secret' },
      ]

      expect(secretContext.secretStringDataForFields(fields)).toEqual({
        plainJson: '{"enabled":true}',
        serviceAccount: {
          project_id: 'example',
          type: 'service_account',
        },
        yamlConfig: {
          enabled: true,
        },
        invalidJson: '{"broken":',
      })
    })

    it('should encode structured fields according to their configured type', () => {
      secretContext.createSecretManifest()

      const fields = [
        { key: 'plainJson', type: 'text' },
        { key: 'serviceAccount', type: 'json-secret' },
        { key: 'yamlConfig', type: 'yaml-secret' },
      ]

      secretContext.setSecretStringDataForFields(fields, {
        plainJson: '{"enabled":true}',
        serviceAccount: {
          project_id: 'example',
          type: 'service_account',
        },
        yamlConfig: {
          enabled: true,
        },
      })

      expect(decodeBase64(secretContext.secretData.plainJson)).toBe('{"enabled":true}')
      expect(decodeBase64(secretContext.secretData.serviceAccount)).toBe('{"project_id":"example","type":"service_account"}')
      expect(decodeBase64(secretContext.secretData.yamlConfig)).toBe('enabled: true\n')
    })

    it('should omit empty configured fields while preserving other empty values', () => {
      secretContext.createSecretManifest()

      const fields = [
        { key: 'AWS_REGION', type: 'text', omitWhenEmpty: true },
        { key: 'AZURE_CLOUD', type: 'select', omitWhenEmpty: true },
        { key: 'TSIGSecretAlgorithm', type: 'select', omitWhenEmpty: true },
        { key: 'emptyValue', type: 'text' },
      ]

      secretContext.setSecretStringDataForFields(fields, {
        AWS_REGION: '',
        AZURE_CLOUD: '',
        TSIGSecretAlgorithm: '',
        emptyValue: '',
      })

      expect(secretContext.secretData).toEqual({
        AWS_REGION: undefined,
        AZURE_CLOUD: undefined,
        TSIGSecretAlgorithm: undefined,
        emptyValue: encodeBase64(''),
      })
      expect(secretContext.secretManifest.data).toEqual({
        emptyValue: encodeBase64(''),
      })
    })

    it('should preserve falsy values when encoding secretStringData', () => {
      secretContext.createSecretManifest()

      secretContext.secretStringData = {
        zero: 0,
        bool: false,
        empty: '',
        nullValue: null,
      }

      expect(secretContext.secretData).toEqual({
        zero: encodeBase64('0'),
        bool: encodeBase64('false'),
        empty: encodeBase64(''),
        nullValue: undefined,
      })
    })

    describe('dnsSecretProviderType', () => {
      it('should get and set dns provider type correctly', () => {
        secretContext.setSecretManifest({
          metadata: {
            name: 'my-secret',
            namespace: testNamespace,
            labels: {
              'other.label1': 'true',
              'provider.shoot.gardener.cloud/aws-route53': 'true',
              'other.label2': 'true',
              'provider.shoot.gardener.cloud/google-clouddns': 'true',
            },
          },
          data: {},
        })

        // Test getter - should extract first provider type from provider shoot label (fallback)
        expect(secretContext.dnsSecretProviderType).toBe('aws-route53')

        // Test setter - should set dashboard specific label
        secretContext.dnsSecretProviderType = 'azure-dns'
        expect(secretContext.secretManifest.metadata.labels).toEqual({
          'other.label1': 'true',
          'provider.shoot.gardener.cloud/aws-route53': 'true',
          'other.label2': 'true',
          'provider.shoot.gardener.cloud/google-clouddns': 'true',
          'dashboard.gardener.cloud/dnsProviderType': 'azure-dns',
        })
        expect(secretContext.dnsSecretProviderType).toBe('azure-dns') // Should prefer dashboard specific label
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

        expect(secretContext.dnsSecretProviderType).toBeUndefined()
      })
    })
  })
})
