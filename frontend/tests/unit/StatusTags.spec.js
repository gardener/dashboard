//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'
import Vuex from 'vuex'

import map from 'lodash/map'

// Components
import StatusTags from '@/components/StatusTags'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'
import shootModule from '@/store/modules/shoots'

describe('condition.vue', () => {
  const localVue = createLocalVue()

  localVue.use(Vuetify)
  localVue.use(Vuex)
  let vuetify
  let store

  const cfg = {
    knownConditions: {
      ControlPlaneHealthy: {
        name: 'Control Plane Overwritten',
        shortName: 'CPO',
        description: 'Overwritten Description'
      },
      ConditionFromConfigAvailability: {
        name: 'Config Condition',
        shortName: 'CC',
        description: 'Config Condition Description'
      },
      ImportantCondition: {
        name: 'Important Condition',
        shortName: 'IC',
        description: 'Important Config Condition Description',
        sortOrder: '0'
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
    return wrapper
  }

  beforeEach(() => {
    vuetify = new Vuetify()
    store = new Vuex.Store({
      state: {
        cfg
      },
      modules: {
        shoots: shootModule
      }
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
    expect(condition.name).toBe('Extra Long Sample TEST Condition')
    expect(condition.description).toBeUndefined()
  })

  it('should generate condition object for single condition type', () => {
    const wrapper = shallowMountStatusTags(['Singlecondition'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('S')
    expect(condition.name).toBe('Singlecondition')
    expect(condition.description).toBeUndefined()
  })

  it('should return condition object for known condition types', () => {
    const wrapper = shallowMountStatusTags(['APIServerAvailable'])
    const condition = wrapper.vm.conditions[0]
    expect(condition.shortName).toBe('API')
    expect(condition.name).toBe('API Server')
    expect(condition.sortOrder).toBe('0')
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

  it('should return conditions sorted by sortvalue and shortname', () => {
    const wrapper = shallowMountStatusTags(['CB', 'AB', 'ImportantCondition'])
    const firstCondition = wrapper.vm.conditions[0]
    const secondCondition = wrapper.vm.conditions[1]
    const thirdCondition = wrapper.vm.conditions[2]
    expect(firstCondition.shortName).toBe('IC')
    expect(secondCondition.shortName).toBe('A')
    expect(thirdCondition.shortName).toBe('C')
  })
})
