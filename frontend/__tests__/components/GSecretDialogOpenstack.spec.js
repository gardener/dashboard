//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

import GSecretDialogOpenstack from '@/components/Credentials/GSecretDialogOpenstack'

import { useSecretContext } from '@/composables/credential/useSecretContext'

import { encodeBase64 } from '@/utils'

let secretContext

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
  props: {
    credential: {
      type: Object,
    },
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
    credential,
    providerType = 'openstack',
    vendorType = 'infra',
  } = {}) {
    return mount(GSecretDialogOpenstack, {
      props: {
        modelValue: true,
        credential,
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

  it('hydrates Designate aliases and writes camel case keys without dropping unmanaged data', async () => {
    const credential = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'designate-secret',
        namespace: 'garden-project',
      },
      data: {
        OS_AUTH_URL: encodeBase64('https://identity.example.org'),
        OS_DOMAIN_NAME: encodeBase64('example-domain'),
        OS_PROJECT_NAME: encodeBase64('example-project'),
        OS_USERNAME: encodeBase64('old-user'),
        OS_PASSWORD: encodeBase64('old-password'),
        OS_REGION_NAME: encodeBase64('region-one'),
        CACERT: encodeBase64('keep-certificate'),
      },
    }
    const wrapper = mountDialog({
      credential,
      providerType: 'openstack-designate',
      vendorType: 'dns',
    })
    await nextTick()

    expect(wrapper.vm.authURL).toBe('https://identity.example.org')
    expect(wrapper.vm.domainName).toBe('example-domain')
    expect(wrapper.vm.tenantName).toBe('example-project')
    expect(wrapper.vm.username).toBe('old-user')

    expect(secretContext.secretManifest.value.data).toEqual(credential.data)

    await wrapper.get('[data-field="username"]').setValue('new-user')

    expect(secretContext.secretManifest.value.data).toEqual({
      authURL: encodeBase64('https://identity.example.org'),
      domainName: encodeBase64('example-domain'),
      tenantName: encodeBase64('example-project'),
      username: encodeBase64('new-user'),
      password: encodeBase64('old-password'),
      OS_REGION_NAME: encodeBase64('region-one'),
      CACERT: encodeBase64('keep-certificate'),
    })
  })
})
