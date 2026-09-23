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

describe('views', () => {
  describe('g-credentials', () => {
    let cloudProfileStore
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
            VBtn: VBtnStub,
            VCard: SlotStub,
            VCardText: SlotStub,
            VContainer: SlotStub,
            VList: SlotStub,
            VListItem: SlotStub,
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
      vi.spyOn(useAuthzStore(), 'canCreateCredentials', 'get').mockReturnValue(true)
    })

    afterEach(() => {
      wrapper?.unmount()
    })

    it('directly opens the infrastructure credential dialog for a single provider', async () => {
      await mountComponent({
        infraProviderTypes: ['aws'],
        dnsProviderTypes: ['aws-route53', 'google-clouddns'],
      })

      expect(wrapper.find('[data-test="create-infra-credential-menu"]').exists()).toBe(false)
      await wrapper.find('[data-test="create-infra-credential-button"]').trigger('click')

      expect(wrapper.vm.visibleCredentialDialog).toBe('aws')
      expect(wrapper.vm.visibleCredentialVendorType).toBe('infra')
    })

    it('directly opens the DNS credential dialog for a single provider', async () => {
      await mountComponent({
        infraProviderTypes: ['aws', 'gcp'],
        dnsProviderTypes: ['aws-route53'],
      })

      expect(wrapper.find('[data-test="create-dns-credential-menu"]').exists()).toBe(false)
      await wrapper.find('[data-test="create-dns-credential-button"]').trigger('click')

      expect(wrapper.vm.visibleCredentialDialog).toBe('aws-route53')
      expect(wrapper.vm.visibleCredentialVendorType).toBe('dns')
    })

    it('keeps provider menus when multiple choices are available', async () => {
      await mountComponent({
        infraProviderTypes: ['aws', 'gcp'],
        dnsProviderTypes: ['aws-route53', 'google-clouddns'],
      })

      expect(wrapper.find('[data-test="create-infra-credential-menu"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="create-dns-credential-menu"]').exists()).toBe(true)
    })
  })
})
