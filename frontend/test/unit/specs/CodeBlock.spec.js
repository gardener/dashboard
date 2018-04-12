//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import Vue from 'vue'
import CodeBlock from '@/components/CodeBlock'
import VIcon from 'vuetify/es5/components/VIcon'
import VBtn from 'vuetify/es5/components/VBtn'

describe('CodeBlock.vue', function () {
  it('should render correct contents', function () {
    const Ctor = Vue.extend(CodeBlock)
    const propsData = {
      lang: 'yaml',
      content: `
        ---
        foo: true
        bar: 42`
    }
    const vm = new Ctor({
      propsData,
      components: {
        VIcon,
        VBtn
      }
    }).$mount()
    return new Promise(resolve => vm.$nextTick(resolve))
      .then(() => {
        const codeElement = vm.$el.querySelector('code.yaml')
        expect(codeElement).to.be.an.instanceof(HTMLElement)
        expect(codeElement.querySelector('.hljs-meta').textContent).to.equal('---')
        expect(codeElement.querySelector('.hljs-literal').textContent).to.equal('true')
        expect(codeElement.querySelector('.hljs-number').textContent).to.equal('42')
        const attrs = Array.prototype.map.call(codeElement.querySelectorAll('.hljs-attr'), el => el.textContent)
        expect(attrs).to.eql(['foo:', 'bar:'])
      })
  })
})
