//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GAutoHide from '@/components/GAutoHide.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'

describe('components', () => {
  describe('g-account-avatar', () => {
    function mountComponent (props = {}) {
      return shallowMount(GAccountAvatar, {
        props,
        global: {
          stubs: {
            GAutoHide: {
              template: '<div class="auto-hide"><slot name="activator" /><slot /></div>',
            },
          },
        },
      })
    }

    it('should offer hover-only copying for an email account', () => {
      const wrapper = mountComponent({ accountName: 'user@example.org' })

      expect(wrapper.findComponent(GAutoHide).exists()).toBe(true)
      expect(wrapper.findComponent(GCopyBtn).props()).toMatchObject({
        clipboardText: 'user@example.org',
        density: 'compact',
        iconSizePx: 16,
      })
    })

    it('should allow callers to place the copy action elsewhere', () => {
      const wrapper = mountComponent({
        accountName: 'user@example.org',
        copyable: false,
      })

      expect(wrapper.findComponent(GAutoHide).exists()).toBe(false)
      expect(wrapper.findComponent(GCopyBtn).exists()).toBe(false)
      expect(wrapper.text()).toContain('user@example.org')
    })

    it('should not offer copying for a non-email account', () => {
      const wrapper = mountComponent({ accountName: 'technical-user' })

      expect(wrapper.findComponent(GAutoHide).exists()).toBe(false)
      expect(wrapper.findComponent(GCopyBtn).exists()).toBe(false)
      expect(wrapper.text()).toContain('technical-user')
    })
  })
})
