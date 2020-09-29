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

import { shallowMount } from '@vue/test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import StatusTag from '@/components/StatusTag.vue'
import { state, actions, getters, mutations } from '@/store'

Vue.use(Vuetify)
Vue.use(Vuex)

const store = new Vuex.Store({
  state,
  actions,
  getters,
  mutations
})

const bus = new Vue({})
Object.defineProperties(Vue.prototype, {
  $bus: { value: bus }
})

function createStatusTagComponent (conditionType) {
  const propsData = {
    condition: {
      type: conditionType
    },
    popperKey: 'foo'
  }
  const wrapper = shallowMount(StatusTag, {
    store,
    propsData
  })
  const statustagComponent = wrapper.findComponent(StatusTag)
  return statustagComponent.vm.tag
}

describe('StatusTag.vue', () => {
  beforeEach(() => {
    const cfg = {
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
    return store.dispatch('setConfiguration', cfg)
  })

  it('should generate condition object for simple condition type', () => {
    const statusTag = createStatusTagComponent('SampleConditionAvailability')

    expect(statusTag.shortName).toBe('SC')
    expect(statusTag.name).toBe('Sample Condition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should generate condition object for long condition type', () => {
    const statusTag = createStatusTagComponent('ExtraLongSampleTESTConditionAvailable')

    expect(statusTag.shortName).toBe('ELSTC')
    expect(statusTag.name).toBe('Extra Long Sample Test Condition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should generate condition object for single condition type', () => {
    const statusTag = createStatusTagComponent('Singlecondition')

    expect(statusTag.shortName).toBe('S')
    expect(statusTag.name).toBe('Singlecondition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should cache generated condition object for unknown condition type', () => {
    expect(store.state.conditionCache.UnknownCondition).toBeUndefined()

    const statusTag = createStatusTagComponent('UnknownCondition')
    expect(statusTag.shortName).toBe('UC')

    expect(store.state.conditionCache.UnknownCondition.shortName).toBe('UC')
  })

  it('should return condition object for known condition types', () => {
    const statusTag = createStatusTagComponent('APIServerAvailable')

    expect(statusTag.shortName).toBe('API')
    expect(statusTag.name).toBe('API Server')
    expect(statusTag.description).not.toHaveLength(0)
  })

  it('should return condition object for condition types loaded from config', () => {
    const statusTag = createStatusTagComponent('ConditionFromConfigAvailability')

    expect(statusTag.shortName).toBe('CC')
    expect(statusTag.name).toBe('Config Condition')
    expect(statusTag.description).toBe('Config Condition Description')
  })

  it('should return overwritten known condition with values from config', () => {
    const statusTag = createStatusTagComponent('ControlPlaneHealthy')

    expect(statusTag.shortName).toBe('CPO')
    expect(statusTag.name).toBe('Control Plane Overwritten')
    expect(statusTag.description).toBe('Overwritten Description')
  })
})
