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

import GGenericInputField from '@/components/GGenericInputField'
import GSecretDialogGdchDns from '@/components/Credentials/GSecretDialogGdchDns'

import { useSecretContext } from '@/composables/credential/useSecretContext'

import { encodeBase64 } from '@/utils'

const TextareaStub = {
  name: 'VTextarea',
  props: {
    modelValue: { type: [String, Object] },
  },
  emits: [
    'update:modelValue',
    'blur',
  ],
  template: `
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
}

const TextFieldStub = {
  name: 'VTextField',
  props: {
    modelValue: { type: [String, Number, Boolean] },
  },
  emits: [
    'update:modelValue',
    'blur',
  ],
  template: `
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    >
  `,
}

describe('GSecretDialogGdchDns', () => {
  let secretContext
  const originalFileReader = globalThis.FileReader

  afterEach(() => {
    vi.stubGlobal('FileReader', originalFileReader)
  })

  function mountDialog ({ credential } = {}) {
    const SecretDialogStub = defineComponent({
      name: 'GSecretDialog',
      props: {
        credential: { type: Object },
      },
      setup (props) {
        secretContext = useSecretContext()
        onMounted(() => {
          if (props.credential) {
            secretContext.setSecretManifest(props.credential)
          } else {
            secretContext.createSecretManifest()
          }
        })
      },
      template: '<div><slot name="secret-slot" /><slot name="help-slot" /></div>',
    })

    return mount(GSecretDialogGdchDns, {
      props: {
        credential,
        modelValue: true,
        providerType: 'gdch-dns',
        vendorType: 'dns',
      },
      global: {
        plugins: [
          createTestingPinia({ stubActions: false }),
        ],
        stubs: {
          GSecretDialog: SecretDialogStub,
          VTextField: TextFieldStub,
          VTextarea: TextareaStub,
        },
      },
    })
  }

  function fieldByLabel (wrapper, label) {
    return wrapper.findAllComponents(GGenericInputField)
      .find(component => component.props('field').label === label)
  }

  it('serializes the DNS org fields into the gdch-config secret value', async () => {
    const wrapper = mountDialog()
    await nextTick()

    expect(fieldByLabel(wrapper, 'CA Bundle').props('field').sensitive).toBeUndefined()

    await fieldByLabel(wrapper, 'Service Identity Key').find('textarea').setValue('{"name":"dns-identity"}')
    await fieldByLabel(wrapper, 'Org Cluster URL').find('input').setValue('https://org.example.org')
    await fieldByLabel(wrapper, 'CA Bundle').find('textarea').setValue('org-ca')

    expect(secretContext.secretManifest.value.data).toEqual({
      'serviceaccount.json': encodeBase64('{"name":"dns-identity"}'),
      'gdch-config': encodeBase64(JSON.stringify({
        url: 'https://org.example.org',
        caBundle: encodeBase64('org-ca'),
      })),
    })
  })

  it('imports a PEM file into the CA Bundle field', async () => {
    vi.stubGlobal('FileReader', class {
      readAsText () {
        this.onload({
          target: {
            result: '-----BEGIN CERTIFICATE-----\\ncertificate\\n-----END CERTIFICATE-----',
          },
        })
      }
    })
    const wrapper = mountDialog()
    await nextTick()

    const event = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        files: [{ name: 'ca-bundle.pem', type: 'application/x-pem-file' }],
      },
    })
    fieldByLabel(wrapper, 'CA Bundle').find('textarea').element.dispatchEvent(event)
    await nextTick()

    expect(fieldByLabel(wrapper, 'CA Bundle').find('textarea').element.value).toContain('BEGIN CERTIFICATE')
    expect(secretContext.secretManifest.value.data['gdch-config']).toBe(encodeBase64(JSON.stringify({
      caBundle: encodeBase64('-----BEGIN CERTIFICATE-----\\ncertificate\\n-----END CERTIFICATE-----'),
    })))
  })

  it('unpacks an existing DNS org config into separate fields', async () => {
    const config = {
      url: 'https://org.example.org',
      caBundle: encodeBase64('org-ca'),
    }
    const wrapper = mountDialog({
      credential: {
        metadata: {
          name: 'existing-gdch-dns-secret',
          namespace: 'garden-project',
        },
        data: {
          'serviceaccount.json': encodeBase64('{"name":"dns-identity"}'),
          'gdch-config': encodeBase64(JSON.stringify(config)),
        },
      },
    })
    await nextTick()

    expect(fieldByLabel(wrapper, 'Org Cluster URL').find('input').element.value).toBe(config.url)
    expect(fieldByLabel(wrapper, 'CA Bundle').find('textarea').element.value).toBe('org-ca')
  })
})
