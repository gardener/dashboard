//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
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

import { useConfigStore } from '@/store/config'

import GGenericInputFields from '@/components/GGenericInputFields'
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

const TextFieldStub = {
  name: 'VTextField',
  props: {
    modelValue: {
      type: [String, Number, Boolean],
    },
    type: {
      type: String,
    },
    autocomplete: {
      type: String,
    },
    appendIcon: {
      type: String,
    },
    errorMessages: {
      type: Array,
    },
  },
  emits: [
    'update:modelValue',
    'blur',
    'click:append',
  ],
  template: `
    <div>
      <input
        :value="modelValue"
        :type="type"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
      />
      <button
        v-if="appendIcon"
        class="append-icon"
        type="button"
        @click="$emit('click:append')"
      />
    </div>
  `,
}

describe('GSecretDialogGeneric', () => {
  let secretContext
  let getSecretValidations

  function mountDialog ({
    credential,
    providerType = 'custom-dns',
    vendorType = 'dns',
    configuration,
    slots,
  } = {}) {
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
      template: `
        <div>
          <slot name="secret-slot" />
          <slot name="help-slot" />
        </div>
      `,
    })

    const pinia = createTestingPinia({ stubActions: false })
    if (configuration) {
      useConfigStore(pinia).setConfiguration(configuration)
    }

    return mount(GSecretDialogGeneric, {
      props: {
        credential,
        modelValue: true,
        providerType,
        vendorType,
      },
      global: {
        plugins: [
          pinia,
        ],
        stubs: {
          GSecretDialog: SecretDialogStub,
          VTextField: TextFieldStub,
          VTextarea: TextareaStub,
        },
      },
      slots,
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

  it('creates a Netlify Secret through its configured sensitive field', async () => {
    const wrapper = mountDialog({ providerType: 'netlify-dns' })
    await nextTick()

    expect(wrapper.getComponent(GGenericInputFields).props('fields')).toEqual([
      {
        key: 'apiToken',
        label: 'Netlify API Token',
        type: 'text',
        sensitive: true,
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ])

    const textField = wrapper.getComponent(TextFieldStub)
    expect(textField.props()).toMatchObject({
      type: 'password',
      autocomplete: 'off',
      appendIcon: 'mdi-eye',
    })
    expect(getSecretValidations().$invalid).toBe(true)

    await wrapper.get('input').setValue('new-token')

    expect(secretContext.secretManifest.value.data).toEqual({
      apiToken: encodeBase64('new-token'),
    })
    expect(getSecretValidations().$invalid).toBe(false)

    await wrapper.get('.append-icon').trigger('click')
    expect(textField.props()).toMatchObject({
      type: 'text',
      appendIcon: 'mdi-eye-off',
    })
  })

  it('updates a Netlify token without dropping unmanaged Secret data', async () => {
    const unmanagedValue = encodeBase64('keep-me')
    const credential = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'existing-netlify-secret',
        namespace: 'garden-project',
      },
      type: 'Opaque',
      data: {
        apiToken: encodeBase64('old-token'),
        unmanaged: unmanagedValue,
      },
    }
    const wrapper = mountDialog({
      credential,
      providerType: 'netlify-dns',
    })
    await nextTick()

    expect(wrapper.get('input').element.value).toBe('old-token')

    await wrapper.get('input').setValue('new-token')

    expect(secretContext.secretManifest.value.data).toEqual({
      apiToken: encodeBase64('new-token'),
      unmanaged: unmanagedValue,
    })
  })

  it('renders the configured Netlify help as an external link', async () => {
    const wrapper = mountDialog({ providerType: 'netlify-dns' })
    await nextTick()

    expect(wrapper.get('.markdown').text()).toContain('authenticate with the Netlify DNS API')
    const link = wrapper.get('.markdown a')
    expect(link.attributes()).toMatchObject({
      href: 'https://docs.netlify.com/cli/get-started/#obtain-a-token-in-the-netlify-ui',
      target: '_blank',
      rel: 'noopener',
    })
    expect(wrapper.get('.markdown').text()).not.toContain('base64 encode')
  })

  it('does not allow runtime branding to replace Netlify field definitions or help', async () => {
    const wrapper = mountDialog({
      providerType: 'netlify-dns',
      configuration: {
        branding: {
          dnsVendors: [
            {
              name: 'netlify-dns',
              secret: {
                fields: [],
                help: '<p>Injected runtime help</p>',
              },
            },
          ],
        },
      },
    })
    await nextTick()

    expect(wrapper.findComponent(GGenericInputFields).exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.get('.markdown').text()).toContain('authenticate with the Netlify DNS API')
    expect(wrapper.get('.markdown').text()).not.toContain('Injected runtime help')
  })

  it('renders custom help while keeping the configured input fields', async () => {
    const wrapper = mountDialog({
      providerType: 'netlify-dns',
      slots: {
        help: '<div data-test-id="custom-help">Custom help</div>',
      },
    })
    await nextTick()

    expect(wrapper.findComponent(GGenericInputFields).exists()).toBe(true)
    expect(wrapper.get('[data-test-id="custom-help"]').text()).toBe('Custom help')
    expect(wrapper.find('.markdown').exists()).toBe(false)
  })

  it('creates an AWS Secret through its configured fields', async () => {
    const wrapper = mountDialog({
      providerType: 'aws',
      vendorType: 'infra',
    })
    await nextTick()

    const fields = wrapper.getComponent(GGenericInputFields).props('fields')
    expect(fields.map(({ key }) => key)).toEqual(['accessKeyID', 'secretAccessKey'])
    expect(fields[1]).toMatchObject({
      type: 'text',
      sensitive: true,
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('AKIAIOSFODNN7EXAMPLE')
    await inputs[1].setValue('wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY')

    expect(secretContext.secretManifest.value.data).toEqual({
      accessKeyID: encodeBase64('AKIAIOSFODNN7EXAMPLE'),
      secretAccessKey: encodeBase64('wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY'),
    })
    expect(getSecretValidations().$invalid).toBe(false)
  })

  it('omits an empty optional Route53 region', async () => {
    const wrapper = mountDialog({ providerType: 'aws-route53' })
    await nextTick()

    const fields = wrapper.getComponent(GGenericInputFields).props('fields')
    expect(fields[2]).toMatchObject({
      key: 'AWS_REGION',
      omitWhenEmpty: true,
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('AKIAIOSFODNN7EXAMPLE')
    await inputs[1].setValue('wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY')
    await inputs[2].setValue('eu-central-1')
    await inputs[2].setValue('')

    expect(secretContext.secretManifest.value.data).toEqual({
      accessKeyID: encodeBase64('AKIAIOSFODNN7EXAMPLE'),
      secretAccessKey: encodeBase64('wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY'),
    })
  })
})
