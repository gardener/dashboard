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

const bus = new Vue({})
Object.defineProperties(localVue.prototype, {
  $bus: { value: bus }
})

describe('StatusTag.vue', function () {
  let store

  beforeEach(() => {
    store = new Vuex.Store({
      state: {
        cfg: {
          knownConditions: {
            ControlPlaneHealthy: {
              displayName: 'Control Plane Overwritten',
              shortName: 'CPO',
              description: 'Overwritten Description'
            },
            ConditionFromConfigAvailability: {
              displayName: 'Config Condition',
              shortName: 'CC',
              description: 'Config Condition Description'
            }
          }
        }
      },
      modules: {},
      getters: {
        isAdmin: () => {
          return false
        }
      }
    })
  })
  it('should generate condition object for unknown condition types', function () {
    let conditionType = 'SampleConditionAvailability'
    let propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }
    let wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    let statustagComponent = wrapper.find(StatusTag)
    let conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('SC')
    expect(conditionTag.name).to.equal('Sample Condition')
    expect(conditionTag.description).to.equal(undefined)

    conditionType = 'ExtraLongSampleTESTConditionAvailable'
    propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }
    wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    statustagComponent = wrapper.find(StatusTag)
    conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('ELSC')
    expect(conditionTag.name).to.equal('Extra Long Sample TESTCondition')
    expect(conditionTag.description).to.equal(undefined)

    conditionType = 'Singlecondition'
    propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }
    wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    statustagComponent = wrapper.find(StatusTag)
    conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('S')
    expect(conditionTag.name).to.equal('Singlecondition')
    expect(conditionTag.description).to.equal(undefined)
  })

  it('should return condition object for known condition types', function () {
    const conditionType = 'APIServerAvailable'
    const propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }

    const wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    const statustagComponent = wrapper.find(StatusTag)
    const conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('API')
    expect(conditionTag.name).to.equal('API Server')
    expect(conditionTag.description).to.not.be.empty
  })

  it('should return condition object for condition types loaded from config', function () {
    const conditionType = 'ConditionFromConfigAvailability'
    const propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }

    const wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    const statustagComponent = wrapper.find(StatusTag)
    const conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('CC')
    expect(conditionTag.name).to.equal('Config Condition')
    expect(conditionTag.description).to.equal('Config Condition Description')
  })

  it('should return overwritten known condition with values from config', function () {
    const conditionType = 'ControlPlaneHealthy'
    const propsData = {
      condition: {
        type: conditionType
      },
      popperKey: 'foo'
    }

    const wrapper = mount(StatusTag, {
      localVue,
      store,
      propsData
    })
    const statustagComponent = wrapper.find(StatusTag)
    const conditionTag = statustagComponent.vm.tag

    expect(conditionTag.shortName).to.equal('CPO')
    expect(conditionTag.name).to.equal('Control Plane Overwritten')
    expect(conditionTag.description).to.equal('Overwritten Description')
  })
})
