//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import EventEmitter from 'events'

// Components
import StatusTag from '@/components/StatusTag'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'
import { state, actions, getters, mutations } from '@/store'

describe('StatusTag.vue', () => {
  const localVue = createLocalVue()
  const bus = new EventEmitter()

  localVue.use(Vuetify)
  localVue.use(Vuex)
  Object.defineProperties(localVue, {
    $bus: { value: bus }
  })

  let vuetify
  let store

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

  const shallowMountStatusTag = conditionType => {
    const wrapper = shallowMount(StatusTag, {
      localVue,
      vuetify,
      store,
      propsData: {
        condition: {
          type: conditionType
        },
        popperKey: 'foo'
      }
    })
    store.dispatch('setConfiguration', cfg)
    return wrapper
  }

  beforeEach(() => {
    vuetify = new Vuetify()
    store = new Vuex.Store({
      state,
      actions,
      getters,
      mutations
    })
  })

  it('should generate condition object for simple condition type', () => {
    const wrapper = shallowMountStatusTag('SampleConditionAvailability')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('SC')
    expect(statusTag.name).toBe('Sample Condition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should generate condition object for long condition type', () => {
    const wrapper = shallowMountStatusTag('ExtraLongSampleTESTConditionAvailable')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('ELSTC')
    expect(statusTag.name).toBe('Extra Long Sample Test Condition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should generate condition object for single condition type', () => {
    const wrapper = shallowMountStatusTag('Singlecondition')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('S')
    expect(statusTag.name).toBe('Singlecondition')
    expect(statusTag.description).toBeUndefined()
  })

  it('should cache generated condition object for unknown condition type', () => {
    expect(store.state.conditionCache.UnknownCondition).toBeUndefined()
    const wrapper = shallowMountStatusTag('UnknownCondition')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('UC')
    expect(store.state.conditionCache.UnknownCondition.shortName).toBe('UC')
  })

  it('should return condition object for known condition types', () => {
    const wrapper = shallowMountStatusTag('APIServerAvailable')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('API')
    expect(statusTag.name).toBe('API Server')
    expect(statusTag.description).not.toHaveLength(0)
  })

  it('should return condition object for condition types loaded from config', () => {
    const wrapper = shallowMountStatusTag('ConditionFromConfigAvailability')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('CC')
    expect(statusTag.name).toBe('Config Condition')
    expect(statusTag.description).toBe('Config Condition Description')
  })

  it('should return overwritten known condition with values from config', () => {
    const wrapper = shallowMountStatusTag('ControlPlaneHealthy')
    const statusTag = wrapper.vm.tag
    expect(statusTag.shortName).toBe('CPO')
    expect(statusTag.name).toBe('Control Plane Overwritten')
    expect(statusTag.description).toBe('Overwritten Description')
  })
})
