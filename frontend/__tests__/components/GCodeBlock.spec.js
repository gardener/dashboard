//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GCodeBlock from '@/components/GCodeBlock.vue'

describe('components', () => {
  describe('g-code-block', () => {
    it('should render correct contents', () => {
      const wrapper = shallowMount(GCodeBlock, {
        props: {
          lang: 'yaml',
          content: `
          ---
          foo: true
          bar: 42`,
        },
      })
      const codeWrapper = wrapper.find('code.yaml')
      expect(codeWrapper.exists()).toBe(true)
      expect(codeWrapper.element).toBeInstanceOf(HTMLElement)
      expect(codeWrapper.find('.hljs-meta').text()).toBe('---')
      expect(codeWrapper.find('.hljs-literal').text()).toBe('true')
      expect(codeWrapper.find('.hljs-number').text()).toBe('42')
      const text = w => w.text()
      expect(codeWrapper.findAll('.hljs-attr').map(text)).toEqual(['foo:', 'bar:'])
    })
  })
})
