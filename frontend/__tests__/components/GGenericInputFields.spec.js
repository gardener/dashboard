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

describe('GGenericInputFields', () => {
  function lastEmittedValue (wrapper) {
    const emitted = wrapper.emitted('update:modelValue')
    return emitted[emitted.length - 1][0]
  }

  it('initializes field data with configured defaults', async () => {
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
      TSIGSecretAlgorithm: 'hmac-sha256',
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

  beforeEach(() => {
    warnSpy = vi.spyOn(useLogger(), 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

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
})
