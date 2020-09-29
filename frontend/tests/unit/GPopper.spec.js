//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
