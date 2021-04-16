//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'

// Components
import CopyBtn from '@/components/CopyBtn'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('CopyBtn.vue', () => {
  const localVue = createLocalVue()
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should ensure that the clipboard container is the dialog content', () => {
    const Component = {
      template: `
      <v-dialog v-model="visible" ref="dialog">
        <copy-btn ref="btn"/>
      </v-dialog>
      `,
      data () {
        return {
          visible: true
        }
      },
      components: {
        CopyBtn
      }
    }
    const wrapper = mount(Component, {
      localVue,
      vuetify
    })
    const btn = wrapper.find({ ref: 'btn' })
    expect(btn.exists()).toBe(true)
    const dialog = wrapper.find({ ref: 'dialog' })
    expect(dialog.exists()).toBe(true)
    const content = dialog.find({ ref: 'content' })
    expect(content.exists()).toBe(true)
    expect(btn.vm.clipboard.container).toBe(content.element)
  })

  it('should ensure that the clipboard container is the document body', () => {
    const Component = {
      template: `
      <v-card>
        <copy-btn ref="btn"/>
      </v-card>
      `,
      components: {
        CopyBtn
      }
    }
    const wrapper = mount(Component, {
      localVue,
      vuetify
    })
    const btn = wrapper.find({ ref: 'btn' })
    expect(btn.exists()).toBe(true)
    expect(btn.vm.clipboard.container).toBe(document.body)
  })
})
