//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import CodeBlock from '@/components/CodeBlock.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'

Vue.use(Vuetify)

describe('CodeBlock.vue', () => {
  it('should render correct contents', () => {
    const propsData = {
      lang: 'yaml',
      content: `
        ---
        foo: true
        bar: 42`
    }
    const computed = {
      codeBlockClass () {
        return ''
      }
    }
    const wrapper = shallowMount(CodeBlock, {
      propsData,
      computed
    })
    const vm = wrapper.vm
    return new Promise(resolve => vm.$nextTick(resolve))
      .then(() => {
        const codeElement = vm.$el.querySelector('code.yaml')
        expect(codeElement).toBeInstanceOf(HTMLElement)
        expect(codeElement.querySelector('.hljs-meta').textContent).toBe('---')
        expect(codeElement.querySelector('.hljs-literal').textContent).toBe('true')
        expect(codeElement.querySelector('.hljs-number').textContent).toBe('42')
        const attrs = Array.prototype.map.call(codeElement.querySelectorAll('.hljs-attr'), el => el.textContent)
        expect(attrs).toEqual(['foo:', 'bar:'])
      })
  })
})
