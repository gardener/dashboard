//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import { VMain } from 'vuetify/lib'
Vue.use(Vuetify)

describe('GPopper.vue', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  describe('VMain', () => {
    it('v-main__wrap class should exist', () => {
      const wrapper = mount(VMain, { vuetify })
      const element = wrapper.find('.v-main__wrap')
      expect(element.constructor.name).toBe('Wrapper') // if .v-main__wrap is not found the constructor name would be "ErrorWrapper"
    })
  })
})
