//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Components
import CodeBlock from '@/components/CodeBlock'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'

describe('CodeBlock.vue', () => {
  const localVue = createLocalVue()

  it('should render correct contents', () => {
    const wrapper = shallowMount(CodeBlock, {
      localVue,
      propsData: {
        lang: 'yaml',
        content: `
          ---
          foo: true
          bar: 42`
      },
      computed: {
        codeBlockClass () {
          return ''
        }
      }
    })
    const codeWrapper = wrapper.find('code.yaml')
    expect(codeWrapper.exists()).toBe(true)
    expect(codeWrapper.element).toBeInstanceOf(HTMLElement)
    expect(codeWrapper.find('.hljs-meta').text()).toBe('---')
    expect(codeWrapper.find('.hljs-literal').text()).toBe('true')
    expect(codeWrapper.find('.hljs-number').text()).toBe('42')
    const text = w => w.text()
    expect(codeWrapper.findAll('.hljs-attr').wrappers.map(text)).toEqual(['foo:', 'bar:'])
  })
})
