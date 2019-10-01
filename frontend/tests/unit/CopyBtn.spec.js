//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import { expect } from 'chai'
import Vue from 'vue'
import Vuetify from 'vuetify'
import { mount } from '@vue/test-utils'
import CopyBtn from '@/components/CopyBtn.vue'

Vue.use(Vuetify)
document.body.setAttribute('data-app', true)
global.requestAnimationFrame = cb => cb()

const components = { CopyBtn }

describe('CopyBtn.vue', function () {
  it('should ensure that the clipboard container is the dialog content', function () {
    const template = '<v-dialog ref="dialog"><copy-btn ref="btn"/></v-dialog>'
    const wrapper = mount({ template, components })
    const { btn, dialog } = wrapper.vm.$refs
    expect(btn.clipboard.container).to.equal(dialog.$refs.content)
  })
  it('should ensure that the clipboard container is the document body', function () {
    const template = '<v-card><copy-btn ref="btn"/></v-card>'
    const wrapper = mount({ template, components })
    const { btn } = wrapper.vm.$refs
    expect(btn.clipboard.container).to.equal(document.body)
  })
})
