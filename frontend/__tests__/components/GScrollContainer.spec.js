//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'

import GScrollContainer from '@/components/GScrollContainer.vue'

describe('components', () => {
  describe('g-scroll-container', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should pin the rendered width', async () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockReturnValue({
          width: 87,
          height: 32,
          top: 0,
          right: 87,
          bottom: 32,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        })

      const wrapper = mount(GScrollContainer, {
        props: {
          pinWidth: true,
        },
      })
      await wrapper.vm.$nextTick()
      await Promise.resolve()

      expect(wrapper.attributes('style')).toContain('width: 87px')
      expect(wrapper.attributes('style')).toContain('min-width: 87px')
      expect(wrapper.attributes('style')).toContain('max-width: 87px')
    })
  })
})
