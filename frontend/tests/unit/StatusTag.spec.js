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
import store from '@/store'

Vue.use(Vuetify)
const localVue = createLocalVue()
localVue.use(Vuex)

const bus = new Vue({})
Object.defineProperties(localVue.prototype, {
  $bus: { value: bus }
})

function createStatusTagComponent (conditionType) {
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
  return statustagComponent.vm.tag
}

describe('StatusTag.vue', function () {
  beforeEach(async () => {
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
    await store.dispatch('setConfiguration', cfg)
  })

  it('should generate condition object for simple condition type', function () {
    const statusTag = createStatusTagComponent('SampleConditionAvailability')

    expect(statusTag.shortName).to.equal('SC')
    expect(statusTag.name).to.equal('Sample Condition')
    expect(statusTag.description).to.equal(undefined)
  })

  it('should generate condition object for long condition type', function () {
    const statusTag = createStatusTagComponent('ExtraLongSampleTESTConditionAvailable')

    expect(statusTag.shortName).to.equal('ELSTC')
    expect(statusTag.name).to.equal('Extra Long Sample Test Condition')
    expect(statusTag.description).to.equal(undefined)
  })

  it('should generate condition object for single condition type', function () {
    const statusTag = createStatusTagComponent('Singlecondition')

    expect(statusTag.shortName).to.equal('S')
    expect(statusTag.name).to.equal('Singlecondition')
    expect(statusTag.description).to.equal(undefined)
  })

  it('should cache generated condition object for unknown condition type', function () {
    expect(store.state.conditionCache.UnknownCondition).to.equal(undefined)

    const statusTag = createStatusTagComponent('UnknownCondition')
    expect(statusTag.shortName).to.equal('UC')

    expect(store.state.conditionCache.UnknownCondition).to.not.equal(undefined)
  })

  it('should return condition object for known condition types', function () {
    const statusTag = createStatusTagComponent('APIServerAvailable')

    expect(statusTag.shortName).to.equal('API')
    expect(statusTag.name).to.equal('API Server')
    expect(statusTag.description).to.not.be.empty
  })

  it('should return condition object for condition types loaded from config', function () {
    const statusTag = createStatusTagComponent('ConditionFromConfigAvailability')

    expect(statusTag.shortName).to.equal('CC')
    expect(statusTag.name).to.equal('Config Condition')
    expect(statusTag.description).to.equal('Config Condition Description')
  })

  it('should return overwritten known condition with values from config', function () {
    const statusTag = createStatusTagComponent('ControlPlaneHealthy')

    expect(statusTag.shortName).to.equal('CPO')
    expect(statusTag.name).to.equal('Control Plane Overwritten')
    expect(statusTag.description).to.equal('Overwritten Description')
  })
})
