//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GStatusTag from '@/components/GStatusTag.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-status-tag', () => {
    function mountStatusTag (condition, isAdmin = false) {
      return mount(GStatusTag, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            createTestingPinia({
              initialState: {
                authn: {
                  user: {
                    email: 'test@example.org',
                    isAdmin,
                  },
                },
              },
            }),
          ],
        },
        props: {
          condition,
        },
      })
    }

    it('should render healthy condition object', () => {
      const wrapper = mountStatusTag({
        shortName: 'foo',
        name: 'foo-bar',
        status: 'True',
      }, true)
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

    it('should render accoring to admin status', () => {
      const condition = {
        shortName: 'foo',
        name: 'foo-bar',
        status: 'Progressing',
        showAdminOnly: true,
      }
      let wrapper = mountStatusTag(condition)
      const vm = wrapper.vm
      expect(vm.visible).toBe(false)
      expect(vm.isProgressing).toBe(true)
      expect(vm.color).toBe('primary')
      expect(vm.chipStatus).toBe('Progressing')
      expect(vm.chipIcon).toBe('')

      wrapper = mountStatusTag(condition, true)
      const vmAdmin = wrapper.vm
      expect(vmAdmin.visible).toBe(true)
      expect(vmAdmin.isProgressing).toBe(true)
      expect(vmAdmin.color).toBe('info')
      expect(vmAdmin.chipStatus).toBe('Progressing')
      expect(vmAdmin.chipIcon).toBe('mdi-progress-alert')
    })
  })
})
