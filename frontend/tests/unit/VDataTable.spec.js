//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import { VDataTable } from 'vuetify/lib'
Vue.use(Vuetify)

describe('VDataTable', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to find v-data-table header element', () => {
    const wrapper = mount(VDataTable, {
      vuetify
    })
    const tableHeader = wrapper.find('.v-data-table__wrapper .v-data-table-header')
    expect(tableHeader.constructor.name).toBe('VueWrapper') // if .v-data-table-header is not found the constructor name would be "ErrorWrapper"
  })
})
