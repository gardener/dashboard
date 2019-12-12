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
import { mount, createLocalVue } from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import StatusTag from '@/components/StatusTag.vue'

Vue.use(Vuetify)
const localVue = createLocalVue()
localVue.use(Vuex)

describe('StatusTag.vue', function () {
  let store

  beforeEach(() => {
    store = new Vuex.Store({
      state: {},
      modules: {},
      getters: {
        isAdmin: () => {
          return false
        }
      }
    })
  })
  it('should generate condition object for unknown condition types', function () {
    const conditionType = 'SampleConditionAvailability'
    const propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }
    // const template = '<status-tag></status-tag>'
    const bus = new Vue({})
    Object.defineProperties(localVue.prototype, {
      $bus: { value: bus }
    })
    const wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    const statustagComponent = wrapper.find(StatusTag)
    console.log(Object.getOwnPropertyNames(statustagComponent))

    // const conditionObject = knownConditions[conditionType]
    // expect(conditionObject.shortName.to.equal('SC'))
    // expect(conditionObject.displayName.to.equal('Sample Condition Availability'))
  })
})
