//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  nextTick,
  onMounted,
} from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { load as yamlLoad } from 'js-yaml'

import GSecretDialogGeneric from '@/components/Credentials/GSecretDialogGeneric'

import { useSecretContext } from '@/composables/credential/useSecretContext'

import { encodeBase64 } from '@/utils'

const TextareaStub = {
  name: 'VTextarea',
  props: {
    modelValue: {
      type: [String, Object],
    },
  },
  emits: [
    'update:modelValue',
    'blur',
    'click:append',
  ],
  template: `
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
    />
  `,
}

describe('GSecretDialogGeneric', () => {
  let secretContext
  let getSecretValidations

  function mountDialog ({ credential } = {}) {
    const SecretDialogStub = defineComponent({
      name: 'GSecretDialog',
      props: {
        credential: {
          type: Object,
        },
        secretValidations: {
          type: Object,
          required: true,
        },
      },
      setup (props) {
        secretContext = useSecretContext()
        getSecretValidations = () => props.secretValidations
        onMounted(() => {
          if (props.credential) {
            secretContext.setSecretManifest(props.credential)
          } else {
            secretContext.createSecretManifest()
          }
        })
      },
      template: '<div><slot name="secret-slot" /></div>',
    })

    return mount(GSecretDialogGeneric, {
      props: {
        credential,
        modelValue: true,
        providerType: 'generic-provider',
        vendorType: 'dns',
      },
      global: {
        plugins: [
          createTestingPinia(),
        ],
        stubs: {
          GSecretDialog: SecretDialogStub,
          VTextarea: TextareaStub,
        },
      },
    })
  }

  it('creates the same top-level Secret data from a YAML mapping', async () => {
    const wrapper = mountDialog()
    await nextTick()

    expect(getSecretValidations().$invalid).toBe(true)

    await wrapper.find('textarea').setValue([
      'serviceaccount.json: credentials',
      'project: my-project',
      '',
    ].join('\n'))

    expect(secretContext.secretManifest.value.data).toEqual({
      'serviceaccount.json': encodeBase64('credentials'),
      project: encodeBase64('my-project'),
    })
    expect(getSecretValidations().$invalid).toBe(false)
  })

  it('loads and updates all values when editing an existing Secret', async () => {
    const credential = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'existing-secret',
        namespace: 'garden-project',
      },
      type: 'Opaque',
      data: {
        endpoint: encodeBase64('https://example.org'),
        token: encodeBase64('old-token'),
      },
    }
    const wrapper = mountDialog({ credential })
    await nextTick()

    expect(yamlLoad(wrapper.find('textarea').element.value)).toEqual({
      endpoint: 'https://example.org',
      token: 'old-token',
    })
    expect(secretContext.secretManifest.value.data).toEqual(credential.data)

    await wrapper.find('textarea').setValue([
      'endpoint: https://example.net',
      'token: new-token',
      '',
    ].join('\n'))

    expect(secretContext.secretManifest.value).toMatchObject({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: credential.metadata,
      type: 'Opaque',
      data: {
        endpoint: encodeBase64('https://example.net'),
        token: encodeBase64('new-token'),
      },
    })
  })
})
