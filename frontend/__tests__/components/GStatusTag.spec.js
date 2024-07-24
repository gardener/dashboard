//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { useAuthnStore } from '@/store/authn'

import GStatusTag from '@/components/GStatusTag.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-status-tag', () => {
    const vuetifyPlugin = createVuetifyPlugin()

    let pinia
    let authnStore

    function mountStatusTag (condition) {
      return mount(GStatusTag, {
        global: {
          plugins: [
            vuetifyPlugin,
            pinia,
          ],
        },
        props: {
          condition,
        },
      })
    }

    beforeEach(() => {
      pinia = createPinia()
      authnStore = useAuthnStore(pinia)
      authnStore.user = {
        email: 'test@example.org',
        isAdmin: false,
      }
    })

    it('should render healthy condition object', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'True',
      })
      authnStore.user.isAdmin = true
      const vm = wrapper.vm
      expect(vm.chipText).toBe('foo')
      expect(vm.chipStatus).toBe('Healthy')
      expect(vm.chipTooltip.title).toBe('foo-bar')
      expect(vm.chipIcon).toBe('')
      expect(vm.isError || vm.isUnknown || vm.isProgressing).toBe(false)
      expect(vm.color).toBe('primary')
      expect(vm.visible).toBe(true)
    })

    it('should render condition with user error', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'True',
        codes: [
          'ERR_CONFIGURATION_PROBLEM',
        ],
      })
      const vm = wrapper.vm
      expect(vm.chipText).toBe('foo')
      expect(vm.chipStatus).toBe('Error')
      expect(vm.isError).toBe(true)
      expect(vm.isUserError).toBe(true)
      expect(vm.chipIcon).toBe('mdi-account-alert-outline')
      expect(vm.color).toBe('error')
      expect(vm.visible).toBe(true)
    })

    it('should render condition for a user without admin role', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'Progressing',
        showAdminOnly: true,
      })
      const vm = wrapper.vm
      expect(vm.visible).toBe(false)
      expect(vm.isProgressing).toBe(true)
      expect(vm.color).toBe('primary')
      expect(vm.chipStatus).toBe('Progressing')
      expect(vm.chipIcon).toBe('')
    })

    it('should render condition for a user with admin role', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'Progressing',
        showAdminOnly: true,
      })
      authnStore.user.isAdmin = true
      const vm = wrapper.vm
      expect(vm.visible).toBe(true)
      expect(vm.isProgressing).toBe(true)
      expect(vm.color).toBe('info')
      expect(vm.chipStatus).toBe('Progressing')
      expect(vm.chipIcon).toBe('mdi-progress-alert')
    })
  })
})
