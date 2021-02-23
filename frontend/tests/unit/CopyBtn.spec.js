//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import Vuetify from 'vuetify'
import { mount } from '@vue/test-utils'
import CopyBtn from '@/components/CopyBtn.vue'

Vue.use(Vuetify)
document.body.setAttribute('data-app', true)
// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = cb => cb()

const components = { CopyBtn }

describe('CopyBtn.vue', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should ensure that the clipboard container is the dialog content', () => {
    const template = '<v-dialog v-model="visible" ref="dialog"><copy-btn ref="btn"/></v-dialog>'
    const data = () => {
      return {
        visible: true
      }
    }
    const wrapper = mount({ template, data, components }, { vuetify })
    const { btn, dialog } = wrapper.vm.$refs
    expect(dialog.$refs.content).toBeDefined()
    expect(btn.clipboard.container).toBe(dialog.$refs.content)
  })

  it('should ensure that the clipboard container is the document body', () => {
    const template = '<v-card><copy-btn ref="btn"/></v-card>'
    const wrapper = mount({ template, components })
    const { btn } = wrapper.vm.$refs
    expect(btn.clipboard.container).toBe(document.body)
  })
})
