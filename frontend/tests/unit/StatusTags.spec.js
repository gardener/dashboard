//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import EventEmitter from 'events'

import map from 'lodash/map'

// Components
import StatusTags from '@/components/StatusTags'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'
import { state, actions, getters, mutations } from '@/store'

describe('condition.vue', () => {
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

  const shallowMountStatusTags = conditionTypes => {
    const wrapper = shallowMount(StatusTags, {
      localVue,
      vuetify,
      store,
      computed: {
        shootConditions () {
          return map(conditionTypes, type => {
            return {
              type,
              lastTransitionTime: 'foo-transition-time'
            }
          })
        }
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
    const wrapper = shallowMountStatusTags(['SampleConditionAvailability'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('SC')
    expect(condition.name).toBe('Sample Condition')
    expect(condition.description).toBeUndefined()
  })

  it('should generate condition object for long condition type', () => {
    const wrapper = shallowMountStatusTags(['ExtraLongSampleTESTConditionAvailable'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('ELSTC')
    expect(condition.name).toBe('Extra Long Sample Test Condition')
    expect(condition.description).toBeUndefined()
  })

  it('should generate condition object for single condition type', () => {
    const wrapper = shallowMountStatusTags(['Singlecondition'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('S')
    expect(condition.name).toBe('Singlecondition')
    expect(condition.description).toBeUndefined()
  })

  it('should cache generated condition object for unknown condition type', () => {
    expect(store.state.conditionCache.UnknownCondition).toBeUndefined()
    const wrapper = shallowMountStatusTags(['UnknownCondition'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('UC')
    expect(store.state.conditionCache.UnknownCondition.shortName).toBe('UC')
  })

  it('should return condition object for known condition types', () => {
    const wrapper = shallowMountStatusTags(['APIServerAvailable'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('API')
    expect(condition.name).toBe('API Server')
    expect(condition.description).not.toHaveLength(0)
  })

  it('should return condition object for condition types loaded from config', () => {
    const wrapper = shallowMountStatusTags(['ConditionFromConfigAvailability'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('CC')
    expect(condition.name).toBe('Config Condition')
    expect(condition.description).toBe('Config Condition Description')
  })

  it('should return overwritten known condition with values from config', () => {
    const wrapper = shallowMountStatusTags(['ControlPlaneHealthy'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('CPO')
    expect(condition.name).toBe('Control Plane Overwritten')
    expect(condition.description).toBe('Overwritten Description')
  })

  it('should return conditions sorted by shortname', () => {
    const wrapper = shallowMountStatusTags(['CB', 'AB'])
    const firstCondition = wrapper.vm.conditions[0]
    const secondCondition = wrapper.vm.conditions[1]
    expect(firstCondition.shortName).toBe('A')
    expect(secondCondition.shortName).toBe('C')
  })
})
