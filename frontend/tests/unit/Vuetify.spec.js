//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'

// Components
import { VMain, VSelect, VTextField } from 'vuetify/lib'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('Vuetify', () => {
  const localVue = createLocalVue()
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  describe('VMain', () => {
    const selector = '.v-main__wrap'

    it('v-main__wrap class should exist', () => {
      const wrapper = mount(VMain, {
        localVue,
        vuetify
      })
      expect(wrapper.find(selector).exists()).toBe(true)
    })
  })

  describe('VMessages', () => {
    const selector = '.v-messages__wrapper > .v-messages__message'
    const hint = 'hint test'
    const persistentHint = true

    it('should be able to find v-select hint element', () => {
      const wrapper = mount(VSelect, {
        vuetify,
        propsData: {
          hint,
          persistentHint
        }
      })
      expect(wrapper.find(selector).text()).toBe(hint)
    })

    it('should be able to find v-text-field hint element', () => {
      const wrapper = mount(VTextField, {
        vuetify,
        propsData: {
          hint,
          persistentHint
        }
      })
      expect(wrapper.find(selector).text()).toBe(hint)
    })
  })
})
