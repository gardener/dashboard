//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  nextTick,
} from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import GSecretDialogOpenstack from '@/components/Credentials/GSecretDialogOpenstack'

const GenericInputFieldStub = defineComponent({
  name: 'GGenericInputField',
  props: {
    field: {
      type: Object,
      required: true,
    },
    modelValue: {
      type: [String, Object, Array, Number, Boolean],
    },
  },
  emits: [
    'update:modelValue',
  ],
  template: `
    <input
      :data-field="field.key"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    >
  `,
})

const SecretDialogStub = defineComponent({
  name: 'GSecretDialog',
  template: '<div><slot name="secret-slot" /></div>',
})

const ContainerStub = defineComponent({
  name: 'VContainer',
  template: '<div><slot /></div>',
})

const RadioGroupStub = defineComponent({
  name: 'VRadioGroup',
  props: {
    modelValue: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  template: '<div><slot name="label" /><slot /></div>',
})

describe('GSecretDialogOpenstack', () => {
  function mountDialog ({
    providerType = 'openstack',
    vendorType = 'infra',
  } = {}) {
    return mount(GSecretDialogOpenstack, {
      props: {
        modelValue: true,
        providerType,
        vendorType,
      },
      global: {
        plugins: [
          createTestingPinia({ stubActions: false }),
        ],
        stubs: {
          GExternalLink: true,
          GGenericInputField: GenericInputFieldStub,
          GSecretDialog: SecretDialogStub,
          VContainer: ContainerStub,
          VRadio: true,
          VRadioGroup: RadioGroupStub,
        },
      },
    })
  }

  function renderedFieldKeys (wrapper) {
    return wrapper.findAllComponents(GenericInputFieldStub)
      .map(component => component.props('field').key)
  }

  it('uses configured OpenStack fields for technical user authentication', () => {
    const wrapper = mountDialog()

    expect(wrapper.vm.providerFields.map(field => field.key)).toEqual([
      'authURL',
      'domainName',
      'tenantName',
      'applicationCredentialID',
      'applicationCredentialName',
      'applicationCredentialSecret',
      'username',
      'password',
    ])
    expect(renderedFieldKeys(wrapper)).toEqual([
      'domainName',
      'tenantName',
      'username',
      'password',
    ])
    expect(wrapper.vm.fields.password.sensitive).toBe(true)
  })

  it('includes the authentication URL for OpenStack Designate', () => {
    const wrapper = mountDialog({
      providerType: 'openstack-designate',
      vendorType: 'dns',
    })

    expect(renderedFieldKeys(wrapper)).toEqual([
      'authURL',
      'domainName',
      'tenantName',
      'username',
      'password',
    ])
  })

  it('clears technical user values when switching authentication methods', async () => {
    const wrapper = mountDialog()
    wrapper.vm.username = 'technical-user'
    wrapper.vm.password = 'password'

    wrapper.vm.authenticationMethod = 'APPLICATION_CREDENTIALS'
    await nextTick()

    expect(wrapper.vm.username).toBe('')
    expect(wrapper.vm.password).toBe('')
    expect(renderedFieldKeys(wrapper)).toEqual([
      'domainName',
      'tenantName',
      'applicationCredentialID',
      'applicationCredentialName',
      'applicationCredentialSecret',
    ])
    expect(wrapper.vm.fields.applicationCredentialSecret.sensitive).toBe(true)
  })
})
