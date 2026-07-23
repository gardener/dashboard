//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

import GGenericInputField from '@/components/GGenericInputField'
import GGenericInputFields from '@/components/GGenericInputFields'

import { useLogger } from '@/composables/useLogger'

const TextFieldStub = {
  name: 'VTextField',
  props: {
    modelValue: {
      type: [String, Object, Array, Number, Boolean],
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
      default: () => [],
    },
  },
  emits: [
    'update:modelValue',
    'blur',
    'click:append',
  ],
  template: `
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
    >
  `,
}

const SelectStub = {
  name: 'VSelect',
  props: {
    modelValue: {
      type: [String, Object, Array, Number, Boolean],
    },
    items: {
      type: Array,
    },
    multiple: {
      type: Boolean,
    },
    errorMessages: {
      type: Array,
      default: () => [],
    },
  },
  emits: [
    'update:modelValue',
    'blur',
  ],
  template: '<select @blur="$emit(\'blur\')" />',
}

const TextareaStub = {
  name: 'VTextarea',
  props: {
    modelValue: {
      type: [String, Object, Array, Number, Boolean],
    },
    autocomplete: {
      type: String,
    },
    appendIcon: {
      type: String,
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

function lastEmittedValue (wrapper) {
  return wrapper.emitted('update:modelValue').at(-1)[0]
}

describe('GGenericInputFields', () => {
  function mountInputFields (props) {
    return shallowMount(GGenericInputFields, {
      props,
      global: {
        stubs: {
          GGenericInputField: true,
        },
      },
    })
  }

  it('initializes field data with cloned configured defaults', async () => {
    const defaultValue = ['one']
    const wrapper = mountInputFields({
      fields: [
        {
          key: 'regions',
          label: 'Regions',
          type: 'select-multiple',
          defaultValue,
        },
      ],
      modelValue: {},
    })

    await nextTick()

    const emittedValue = lastEmittedValue(wrapper)
    expect(emittedValue).toEqual({
      regions: ['one'],
    })

    emittedValue.regions.push('two')
    expect(defaultValue).toEqual(['one'])
  })

  it('keeps existing field data over configured defaults without a redundant emit', async () => {
    const wrapper = mountInputFields({
      fields: [
        {
          key: 'algorithm',
          label: 'Algorithm',
          type: 'select',
          defaultValue: 'default',
        },
      ],
      modelValue: {
        algorithm: 'existing',
      },
    })

    await nextTick()

    expect(wrapper.findComponent(GGenericInputField).props('modelValue')).toBe('existing')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('updates the complete field data when a child value changes', async () => {
    const wrapper = mountInputFields({
      fields: [
        {
          key: 'username',
          label: 'Username',
          type: 'text',
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
        },
      ],
      modelValue: {
        username: 'user',
        password: 'old',
      },
    })

    wrapper.findAllComponents(GGenericInputField)[1].vm.$emit('update:modelValue', 'new')
    await nextTick()

    expect(lastEmittedValue(wrapper)).toEqual({
      username: 'user',
      password: 'new',
    })
  })

  it('does not emit for empty field data without defaults', async () => {
    const wrapper = mountInputFields({
      fields: [
        {
          key: 'accessKeyID',
          label: 'Access Key ID',
          type: 'text',
        },
      ],
      modelValue: {},
    })

    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('GGenericInputField', () => {
  const originalFileReader = globalThis.FileReader
  let warnSpy

  beforeEach(() => {
    warnSpy = vi.spyOn(useLogger(), 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    vi.stubGlobal('FileReader', originalFileReader)
  })

  function mountInputField ({
    field,
    modelValue = '',
  }) {
    return shallowMount(GGenericInputField, {
      props: {
        field,
        modelValue,
      },
      global: {
        stubs: {
          VSelect: SelectStub,
          VTextarea: TextareaStub,
          VTextField: TextFieldStub,
        },
      },
    })
  }

  function mountStructuredInputField ({
    field = {
      key: 'secret',
      label: 'Secret',
      type: 'json-secret',
      validators: {},
    },
    modelValue = '',
  } = {}) {
    return mountInputField({
      field,
      modelValue,
    })
  }

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

  it('supports array values for multi-select fields', async () => {
    const wrapper = mountInputField({
      field: {
        key: 'regions',
        label: 'Regions',
        type: 'select-multiple',
        values: ['one', 'two'],
      },
      modelValue: ['one'],
    })
    const select = wrapper.findComponent(SelectStub)

    expect(select.props()).toMatchObject({
      items: ['one', 'two'],
      modelValue: ['one'],
      multiple: true,
    })

    select.vm.$emit('update:modelValue', ['one', 'two'])
    await nextTick()

    expect(lastEmittedValue(wrapper)).toEqual(['one', 'two'])
  })

  it('hides password fields by default and toggles their visibility', async () => {
    const wrapper = mountInputField({
      field: {
        key: 'password',
        label: 'Password',
        type: 'password',
      },
    })
    const input = wrapper.findComponent(TextFieldStub)

    expect(input.props()).toMatchObject({
      appendIcon: 'mdi-eye',
      autocomplete: 'off',
      type: 'password',
    })

    input.vm.$emit('click:append')
    await nextTick()

    expect(input.props()).toMatchObject({
      appendIcon: 'mdi-eye-off',
      type: 'text',
    })
  })

  it('parses structured input and reacts to later parent resets', async () => {
    const wrapper = mountStructuredInputField({
      field: {
        key: 'secret',
        label: 'Secret',
        type: 'yaml-secret',
        validators: {},
      },
      modelValue: {
        existing: 'value',
      },
    })

    expect(wrapper.find('textarea').element.value).toBe('existing: value\n')

    await wrapper.find('textarea').setValue('edited: value\n')
    expect(lastEmittedValue(wrapper)).toEqual({
      edited: 'value',
    })

    await wrapper.setProps({
      modelValue: {
        reset: 'value',
      },
    })
    await nextTick()

    expect(wrapper.find('textarea').element.value).toBe('reset: value\n')
  })

  it('rejects YAML arrays as Secret data', async () => {
    const wrapper = mountStructuredInputField({
      field: {
        key: 'secretData',
        label: 'Secret Data',
        type: 'yaml-secret',
        validators: {
          isYAML: {
            type: 'isValidObject',
          },
        },
      },
    })

    await wrapper.find('textarea').setValue('- item\n')
    await wrapper.find('textarea').trigger('blur')
    await nextTick()

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([
      'You need to enter secret data as YAML key-value pairs',
    ])
  })

  it.each([
    {
      name: 'regex',
      validator: {
        type: 'regex',
        pattern: '^valid$',
      },
      value: 'invalid',
    },
    {
      name: 'GUID',
      validator: {
        type: 'guid',
      },
      value: 'invalid',
    },
    {
      name: 'alphanumeric underscore',
      validator: {
        type: 'alphaNumUnderscore',
      },
      value: 'invalid-value',
    },
    {
      name: 'base64',
      validator: {
        type: 'base64',
      },
      value: 'invalid%',
    },
    {
      name: 'URL',
      validator: {
        type: 'url',
      },
      value: 'invalid',
    },
    {
      name: 'maximum length',
      validator: {
        type: 'maxLength',
        length: 2,
      },
      value: 'long',
    },
    {
      name: 'minimum length',
      validator: {
        type: 'minLength',
        length: 3,
      },
      value: 'x',
    },
  ])('compiles the $name validator', async ({ validator, value }) => {
    const wrapper = mountInputField({
      field: {
        key: 'value',
        label: 'Value',
        type: 'text',
        validators: {
          validation: validator,
        },
      },
    })

    const input = wrapper.find('input')
    await input.setValue(value)
    await wrapper.setProps({ modelValue: value })
    await input.trigger('blur')
    await nextTick()

    expect(wrapper.findComponent(TextFieldStub).props('errorMessages')).toHaveLength(1)
  })

  it.each([
    ['flag', false],
    ['count', 0],
    ['value', ''],
  ])('accepts an explicitly expected %s object property', async (key, expectedValue) => {
    const wrapper = mountStructuredInputField({
      field: {
        key: 'secret',
        label: 'Secret',
        type: 'json-secret',
        validators: {
          property: {
            type: 'hasObjectProp',
            key: [key],
            value: expectedValue,
          },
        },
      },
      modelValue: {
        [key]: expectedValue,
      },
    })

    await wrapper.find('textarea').trigger('blur')
    await nextTick()

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([])
  })

  it('supports nested array paths for object-property validation', async () => {
    const wrapper = mountStructuredInputField({
      field: {
        key: 'secret',
        label: 'Secret',
        type: 'json-secret',
        validators: {
          property: {
            type: 'hasObjectProp',
            key: ['credentials', 'type'],
            value: 'service_account',
          },
        },
      },
      modelValue: {
        credentials: {
          type: 'service_account',
        },
      },
    })

    await wrapper.find('textarea').trigger('blur')
    await nextTick()

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([])
  })

  it('does not mutate validator configuration when deriving messages', async () => {
    const field = {
      key: 'secret',
      label: 'Secret',
      type: 'json-secret',
      validators: {
        validObject: {
          type: 'isValidObject',
        },
        projectID: {
          type: 'hasObjectProp',
          key: 'project_id',
          pattern: /^[a-z][a-z0-9-]+$/,
        },
      },
    }

    mountStructuredInputField({ field })
    await nextTick()

    expect(field.validators.validObject).not.toHaveProperty('message')
    expect(field.validators.projectID).not.toHaveProperty('message')
  })

  it('warns for unsupported validator types', async () => {
    mountInputField({
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
    })

    await nextTick()

    expect(warnSpy).toHaveBeenCalledWith('Ignoring unsupported validator type \'doesNotExist\' for field \'foo\'')
  })

  it('imports a JSON file by extension when its MIME type is missing', async () => {
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

    wrapper.find('textarea').element.dispatchEvent(createDropEvent([{
      name: 'secret.json',
      type: '',
    }]))
    await nextTick()

    expect(lastEmittedValue(wrapper)).toEqual({
      foo: 'bar',
    })
  })

  it('shows and clears file-drop rejection errors', async () => {
    const wrapper = mountStructuredInputField()
    const textarea = wrapper.find('textarea')

    textarea.element.dispatchEvent(createDropEvent([{
      name: 'secret.txt',
      type: 'text/plain',
    }]))
    await nextTick()

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([
      'File "secret.txt" was rejected. Expected a JSON file (.json), but received text/plain.',
    ])

    await textarea.setValue('{"foo":"bar"}')

    expect(wrapper.findComponent(TextareaStub).props('errorMessages')).toEqual([])
  })
})
