//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
