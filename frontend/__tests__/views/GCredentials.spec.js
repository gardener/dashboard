//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

import { useAuthzStore } from '@/store/authz'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GCredentials from '@/views/GCredentials.vue'

import GCreateCredentialButton from '@/components/Credentials/GCreateCredentialButton.vue'
import GCredentialDialogWrapper from '@/components/Credentials/GCredentialDialogWrapper.vue'

const { createVuetifyPlugin } = global.fixtures.helper

const SlotStub = {
  template: '<div><slot /><slot name="append" /></div>',
}

const VMenuStub = {
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
}

const VBtnStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

const VListItemStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot name="prepend" /><slot /></button>',
}

describe('views', () => {
  describe('g-credentials', () => {
    let cloudProfileStore
    let canCreateCredentialsSpy
    let pinia
    let wrapper

    async function mountComponent ({ infraProviderTypes, dnsProviderTypes }) {
      cloudProfileStore.setCloudProfiles(infraProviderTypes.map(type => ({
        spec: { type },
      })))
      useGardenerExtensionStore().dnsProviderTypes = dnsProviderTypes
      wrapper = shallowMount(GCredentials, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
          directives: {
            tooltip: () => {},
          },
          provide: {
            mainContainer: ref(null),
            mergeProps: () => ({}),
          },
          stubs: {
            GToolbar: SlotStub,
            GCreateCredentialButton: false,
            VBtn: VBtnStub,
            VCard: SlotStub,
            VCardText: SlotStub,
            VContainer: SlotStub,
            VList: SlotStub,
            VListItem: VListItemStub,
            VListItemTitle: SlotStub,
            VListSubheader: SlotStub,
            VMenu: VMenuStub,
          },
        },
      })
    }

    beforeEach(() => {
      pinia = createTestingPinia({ stubActions: false })
      setActivePinia(pinia)
      useConfigStore().setConfiguration(global.fixtures.config)
      cloudProfileStore = useCloudProfileStore()
      canCreateCredentialsSpy = vi.spyOn(useAuthzStore(), 'canCreateCredentials', 'get').mockReturnValue(true)
    })

    afterEach(() => {
      wrapper?.unmount()
    })

    function createButton (vendorType) {
      return wrapper.findAllComponents(GCreateCredentialButton).find(component => {
        return component.props('vendorType') === vendorType
      })
    }

    function dialogState ({ operation, vendorType, providerType, credential, binding }) {
      return {
        operation,
        credentialKind: 'Secret',
        vendorType,
        providerType,
        credential,
        binding,
      }
    }

    it('directly opens the infrastructure credential dialog for a single provider', async () => {
      await mountComponent({
        infraProviderTypes: ['aws'],
        dnsProviderTypes: ['aws-route53', 'google-clouddns'],
      })

      expect(wrapper.find('[data-test="create-infra-credential-menu"]').exists()).toBe(false)
      await wrapper.find('[data-test="create-infra-credential-button"]').trigger('click')

      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'create',
        vendorType: 'infra',
        providerType: 'aws',
      }))
    })

    it('directly opens the DNS credential dialog for a single provider', async () => {
      await mountComponent({
        infraProviderTypes: ['aws', 'gcp'],
        dnsProviderTypes: ['aws-route53'],
      })

      expect(wrapper.find('[data-test="create-dns-credential-menu"]').exists()).toBe(false)
      await wrapper.find('[data-test="create-dns-credential-button"]').trigger('click')

      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'create',
        vendorType: 'dns',
        providerType: 'aws-route53',
      }))
    })

    it('keeps provider menus and routes the selected provider when multiple choices are available', async () => {
      await mountComponent({
        infraProviderTypes: ['aws', 'gcp'],
        dnsProviderTypes: ['aws-route53', 'google-clouddns'],
      })

      expect(wrapper.find('[data-test="create-infra-credential-menu"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="create-dns-credential-menu"]').exists()).toBe(true)

      const providerItems = createButton('infra').findAllComponents(VListItemStub)
      expect(providerItems).toHaveLength(2)

      await providerItems[1].trigger('click')

      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'create',
        vendorType: 'infra',
        providerType: 'gcp',
      }))
    })

    it('preserves create authorization behavior', async () => {
      canCreateCredentialsSpy.mockReturnValue(false)

      await mountComponent({
        infraProviderTypes: ['aws'],
        dnsProviderTypes: ['aws-route53'],
      })

      expect(wrapper.find('[data-test="create-infra-credential-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="create-dns-credential-button"]').exists()).toBe(false)
    })

    it('routes edit, delete, and migration operations through dialog state and clears it on close', async () => {
      await mountComponent({
        infraProviderTypes: ['aws'],
        dnsProviderTypes: ['aws-route53'],
      })

      const binding = {
        kind: 'SecretBinding',
        metadata: { name: 'infra-secret' },
        provider: { type: 'aws' },
        secretRef: { name: 'infra-secret' },
      }
      const credential = {
        kind: 'Secret',
        metadata: {
          name: 'dns-secret',
          labels: { 'dashboard.gardener.cloud/dnsProviderType': 'aws-route53' },
        },
      }

      wrapper.vm.onUpdateInfraBinding(binding)
      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'edit',
        vendorType: 'infra',
        providerType: 'aws',
        binding,
      }))

      wrapper.vm.onDeleteDnsCredential(credential)
      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'delete',
        vendorType: 'dns',
        providerType: 'aws-route53',
        credential,
      }))

      wrapper.vm.onMigrateSecretBinding(binding)
      expect(wrapper.vm.dialogState).toEqual(dialogState({
        operation: 'migrate-secret-binding',
        vendorType: 'infra',
        providerType: 'aws',
        binding,
      }))

      wrapper.findComponent(GCredentialDialogWrapper).vm.$emit('dialog-closed')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialogState).toBeUndefined()
    })
  })
})
