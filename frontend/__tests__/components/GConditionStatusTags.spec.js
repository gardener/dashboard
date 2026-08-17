//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { h } from 'vue'
import { shallowMount } from '@vue/test-utils'

import GConditionStatusTags from '@/components/GConditionStatusTags.vue'

describe('components', () => {
  describe('g-condition-status-tags', () => {
    function mountStatusTags (props = {}) {
      return shallowMount(GConditionStatusTags, {
        props: {
          conditions: [
            { type: 'Ready' },
            { type: 'Healthy' },
          ],
          ...props,
        },
        slots: {
          condition: ({ condition }) => h('span', {
            class: 'condition',
            'data-condition-type': condition.type,
          }),
        },
      })
    }

    it('should render the shared readiness row', () => {
      const wrapper = mountStatusTags()

      expect(wrapper.findAll('.condition').map(element => element.attributes('data-condition-type'))).toEqual([
        'Ready',
        'Healthy',
      ])
    })

    it('should render status errors only when status text is enabled', async () => {
      const wrapper = mountStatusTags({
        errorCodeObjects: [{ description: 'Broken readiness' }],
      })

      expect(wrapper.text()).not.toContain('Broken readiness')

      await wrapper.setProps({ showStatusText: true })

      expect(wrapper.text()).toContain('Broken readiness')
    })
  })
})
