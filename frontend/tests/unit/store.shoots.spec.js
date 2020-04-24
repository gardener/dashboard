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

import Vuex from 'vuex'
import { expect } from 'chai'
import { state, actions, getters, mutations, modules } from '@/store'

let store

describe('Store.Shoots', function () {
  beforeEach(function () {
    const shootItems = {
      shoot2_foo: {
        metadata: {
          name: 'shoot2',
          namespace: 'foo'
        },
        spec: {
          creationTimestamp: '2020-01-01T20:00:00Z',
          kubernetes: {
            version: '1.0.0'
          },
          region: 'region1',
          provider: {
            type: 'infra1'
          },
          purpose: 'development'
        },
        status: {
          lastOperation: {
            progress: 100,
            state: 'Succeeded'
          },
          conditions: [
            {
              status: 'True',
              lastTransitionTime: '2020-03-01T20:00:00Z'
            }
          ]
        }
      },
      shoot1_foo: {
        metadata: {
          name: 'shoot1',
          namespace: 'foo'
        },
        spec: {
          creationTimestamp: '2020-02-01T20:00:00Z',
          kubernetes: {
            version: '1.1.0'
          },
          region: 'region1',
          provider: {
            type: 'infra2'
          },
          purpose: 'production'
        },
        status: {
          lastOperation: {
            progress: 90,
            state: 'Succeeded'
          },
          conditions: [
            {
              status: 'False',
              lastTransitionTime: '2020-02-01T20:00:00Z'
            }
          ]
        }
      },
      shoot3_foo: {
        metadata: {
          name: 'shoot3',
          namespace: 'foo'
        },
        spec: {
          creationTimestamp: '2020-01-01T20:00:00Z',
          kubernetes: {
            version: '1.0.0'
          },
          region: 'region2',
          provider: {
            type: 'infra1'
          },
          purpose: 'development'
        },
        status: {
          lastOperation: {
            progress: 100,
            state: 'Succeeded'
          },
          lastErrors: [
            {
              description: 'foo'
            }
          ],
          conditions: [
            {
              status: 'False',
              lastTransitionTime: '2020-01-01T20:00:00Z'
            }
          ]
        }
      }
    }

    // Modifies state of module even if we do not include state in the root store
    // TODO: This is all a bit hacky, think of a cleaner solution on how to create the store
    state.shoots.shoots = shootItems

    store = new Vuex.Store({
      actions,
      getters,
      mutations,
      modules
    })
  })

  it('should sort shoots by name', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['name'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot3')
    expect(sortedShoots[1].metadata.name).to.equal('shoot2')
    expect(sortedShoots[2].metadata.name).to.equal('shoot1')
  })

  it('should sort shoots by purpose', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['purpose'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot2')
    expect(sortedShoots[1].metadata.name).to.equal('shoot3')
    expect(sortedShoots[2].metadata.name).to.equal('shoot1')
  })

  it('should sort shoots by creationTimestamp', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['creationTimestamp'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot1')
    expect(sortedShoots[1].metadata.name).to.equal('shoot2')
    expect(sortedShoots[2].metadata.name).to.equal('shoot3')
  })

  it('should sort shoots by kubernetes version', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['k8sVersion'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot2')
    expect(sortedShoots[1].metadata.name).to.equal('shoot3')
    expect(sortedShoots[2].metadata.name).to.equal('shoot1')
  })

  it('should sort shoots by infrastructure', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['infrastructure'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot1')
    expect(sortedShoots[1].metadata.name).to.equal('shoot3')
    expect(sortedShoots[2].metadata.name).to.equal('shoot2')
  })

  it('should sort shoots by lastOperation (status)', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['lastOperation'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot2')
    expect(sortedShoots[1].metadata.name).to.equal('shoot1')
    expect(sortedShoots[2].metadata.name).to.equal('shoot3')
  })

  it('should sort shoots by readiness', function () {
    store.dispatch('setShootListSortParams', { sortBy: ['readiness'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).to.equal('shoot3')
    expect(sortedShoots[1].metadata.name).to.equal('shoot1')
    expect(sortedShoots[2].metadata.name).to.equal('shoot2')
  })
})
