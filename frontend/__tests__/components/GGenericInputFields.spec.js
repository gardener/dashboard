//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import {
  mount,
  shallowMount,
} from '@vue/test-utils'

import GGenericInputField from '@/components/GGenericInputField'
import GGenericInputFields from '@/components/GGenericInputFields'

import { useLogger } from '@/composables/useLogger'

const { createVuetifyPlugin } = global.fixtures.helper

describe('GGenericInputFields', () => {
  function lastEmittedValue (wrapper) {
    const emitted = wrapper.emitted('update:modelValue')
    return emitted[emitted.length - 1][0]
  }

  it('initializes field data with configured empty defaults', async () => {
    const wrapper = shallowMount(GGenericInputFields, {
      props: {
        fields: [
          {
            key: 'TSIGSecretAlgorithm',
            label: 'TSIG Secret Algorithm',
            type: 'select',
            defaultValue: '',
          },
        ],
        modelValue: {},
      },
      global: {
        stubs: {
          GGenericInputField: true,
        },
      },
    })

    await nextTick()

    expect(lastEmittedValue(wrapper)).toEqual({
      TSIGSecretAlgorithm: '',
    })
  })

  it('keeps existing field data over configured defaults without redundant emit', async () => {
    const wrapper = shallowMount(GGenericInputFields, {
      props: {
        fields: [
          {
            key: 'TSIGSecretAlgorithm',
            label: 'TSIG Secret Algorithm',
            type: 'select',
            defaultValue: 'hmac-sha256',
          },
        ],
        modelValue: {
          TSIGSecretAlgorithm: 'hmac-sha512',
        },
      },
      global: {
        stubs: {
          GGenericInputField: true,
        },
      },
    })

    await nextTick()

    expect(wrapper.findComponent(GGenericInputField).props('modelValue')).toBe('hmac-sha512')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('loads existing field data after initially applying configured defaults', async () => {
    const wrapper = shallowMount(GGenericInputFields, {
      props: {
        fields: [
          {
            key: 'AZURE_CLOUD',
            label: 'Azure Cloud',
            type: 'select',
            defaultValue: '',
          },
          {
            key: 'CLIENT_ID',
            label: 'Client ID',
            type: 'text',
          },
        ],
        modelValue: {},
      },
      global: {
        stubs: {
          GGenericInputField: true,
        },
      },
    })

    await nextTick()
    await wrapper.setProps({
      modelValue: {
        AZURE_CLOUD: 'AzureChina',
        CLIENT_ID: 'client-id',
      },
    })
    await nextTick()

    const fields = wrapper.findAllComponents(GGenericInputField)
    expect(fields[0].props('modelValue')).toBe('AzureChina')
    expect(fields[1].props('modelValue')).toBe('client-id')
    expect(lastEmittedValue(wrapper)).toEqual({
      AZURE_CLOUD: '',
    })
  })

  it('shows the configured empty default as the selected item', async () => {
    const wrapper = mount(GGenericInputFields, {
      props: {
        fields: [
          {
            key: 'AZURE_CLOUD',
            label: 'Azure Cloud',
            type: 'select',
            defaultValue: '',
            values: [
              {
                title: 'Provider default (Azure Public)',
                value: '',
              },
              {
                title: 'AzureChina',
                value: 'AzureChina',
              },
            ],
          },
        ],
        modelValue: {},
      },
      global: {
        plugins: [
          createVuetifyPlugin(),
        ],
      },
    })

    await nextTick()

    expect(wrapper.findComponent({ name: 'VSelect' }).props('modelValue')).toBe('')
    expect(wrapper.text()).toContain('Provider default (Azure Public)')
  })

  it('does not emit when initialized with empty field data and no defaults', async () => {
    const wrapper = shallowMount(GGenericInputFields, {
      props: {
        fields: [
          {
            key: 'accessKeyID',
            label: 'Access Key ID',
            type: 'text',
          },
        ],
        modelValue: {},
      },
      global: {
        stubs: {
          GGenericInputField: true,
        },
      },
    })

    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('GGenericInputField', () => {
  let warnSpy
  const originalFileReader = globalThis.FileReader

  const TextareaStub = {
    name: 'VTextarea',
    props: {
      modelValue: {
        type: [String, Object, Number, Boolean],
      },
      errorMessages: {
        type: Array,
        default: () => [],
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

  beforeEach(() => {
    warnSpy = vi.spyOn(useLogger(), 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    vi.stubGlobal('FileReader', originalFileReader)
  })

  function createDropEvent (files) {
    const event = new Event('drop', {
      bubbles: true,
      cancelable: true,
    })
    Object.defineProperty(event, 'dataTransfer', {
      value: { files },
    })
    return event
  }

  function mountStructuredInputField (props = {}) {
    return shallowMount(GGenericInputField, {
      props: {
        modelValue: '',
        field: {
          key: 'secret',
          label: 'Secret',
          type: 'json-secret',
          validators: {},
        },
        ...props,
      },
      global: {
        stubs: {
          VTextarea: TextareaStub,
        },
      },
    })
  }

  it('warns for unsupported validator types', async () => {
    shallowMount(GGenericInputField, {
      props: {
        modelValue: '',
        field: {
          key: 'foo',
          label: 'Foo',
          type: 'text',
          validators: {
            unsupported: {
              type: 'doesNotExist',
            },
          },
        },
      },
      global: {
        stubs: {
          VTextField: true,
        },
      },
    })

    await nextTick()

    expect(warnSpy).toHaveBeenCalledWith('Ignoring unsupported validator type \'doesNotExist\' for field \'foo\'')
  })

  it('imports a JSON file dropped by extension when the MIME type is missing', async () => {
    vi.stubGlobal('FileReader', class {
      readAsText () {
        this.onload({
          target: {
            result: '{"foo":"bar"}',
          },
        })
      }
    })
    const wrapper = mountStructuredInputField()

    await nextTick()
    wrapper.find('textarea').element.dispatchEvent(createDropEvent([{
      name: 'secret.json',
      type: '',
    }]))

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ foo: 'bar' }],
    ])
  })

  it('shows the rejection reason for unsupported dropped files', async () => {
    const wrapper = mountStructuredInputField()

    await nextTick()
    wrapper.find('textarea').element.dispatchEvent(createDropEvent([{
      name: 'secret.txt',
      type: 'text/plain',
    }]))
    await nextTick()

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([
      'File "secret.txt" was rejected. Expected a JSON file (.json), but received text/plain.',
    ])
  })

  it('shows the drop rejection reason before validation errors', async () => {
    const wrapper = mountStructuredInputField({
      field: {
        key: 'secret',
        label: 'Secret',
        type: 'json-secret',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    })

    await nextTick()
    wrapper.find('textarea').element.dispatchEvent(createDropEvent([{
      name: 'secret.txt',
      type: 'text/plain',
    }]))
    await nextTick()

    const errorMessages = wrapper.findComponent(TextareaStub).props('errorMessages')
    expect(errorMessages[0]).toBe('File "secret.txt" was rejected. Expected a JSON file (.json), but received text/plain.')
    expect(errorMessages).toContain('Value is required')
  })

  it('clears the drop rejection reason after the field is edited', async () => {
    const wrapper = mountStructuredInputField()

    await nextTick()
    wrapper.find('textarea').element.dispatchEvent(createDropEvent([{
      name: 'secret.txt',
      type: 'text/plain',
    }]))
    await nextTick()

    await wrapper.find('textarea').setValue('{"foo":"bar"}')

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([])
  })
})
