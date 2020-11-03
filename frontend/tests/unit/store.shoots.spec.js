//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vuex from 'vuex'
import {
  state,
  actions,
  getters,
  mutations,
  modules,
  mapAccessRestrictionForInput
} from '@/store'

let store

describe('Store.Shoots', () => {
  beforeEach(() => {
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

  it('should sort shoots by name', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['name'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot2')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by purpose', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['purpose'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by creationTimestamp', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['creationTimestamp'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot1')
    expect(sortedShoots[1].metadata.name).toBe('shoot2')
    expect(sortedShoots[2].metadata.name).toBe('shoot3')
  })

  it('should sort shoots by kubernetes version', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['k8sVersion'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by infrastructure', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['infrastructure'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot1')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })

  it('should sort shoots by lastOperation (status)', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['lastOperation'], sortDesc: [true] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot3')
  })

  it('should sort shoots by readiness', () => {
    store.dispatch('setShootListSortParams', { sortBy: ['readiness'], sortDesc: [false] })

    const sortedShoots = store.getters.shootList

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })
})

describe('Store.AccessRestrictions', () => {
  let definition
  let shootResource

  beforeEach(() => {
    definition = {
      key: 'foo',
      input: {
        inverted: false
      },
      options: [
        {
          key: 'foo-option-1',
          input: {
            inverted: false
          }
        },
        {
          key: 'foo-option-2',
          input: {
            inverted: true
          }
        },
        {
          key: 'foo-option-3',
          input: {
            inverted: true
          }
        },
        {
          key: 'foo-option-4',
          input: {
            inverted: true
          }
        }
      ]
    }

    shootResource = {
      metadata: {
        annotations: {
          'foo-option-1': 'false',
          'foo-option-2': 'false',
          'foo-option-3': 'true'
        }
      },
      spec: {
        seedSelector: {
          matchLabels: {
            foo: 'true'
          }
        }
      }
    }
  })

  it('should map definition and shoot resources to access restriction data model', () => {
    const accessRestrictionPair = mapAccessRestrictionForInput(definition, shootResource)
    expect(accessRestrictionPair).toEqual([
      'foo',
      {
        value: true,
        options: {
          'foo-option-1': {
            value: false
          },
          'foo-option-2': {
            value: true // value inverted as defined in definition
          },
          'foo-option-3': {
            value: false // value inverted as defined in definition
          },
          'foo-option-4': {
            value: false // value not set in spec always maps to false
          }
        }
      }
    ])
  })

  it('should invert access restriction', () => {
    definition.input.inverted = true
    const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
    expect(accessRestriction.value).toBe(false)
  })

  it('should not invert option', () => {
    definition.options[1].input.inverted = false
    const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
    expect(accessRestriction.options['foo-option-2'].value).toBe(false)
  })

  it('should invert option', () => {
    definition.options[1].input.inverted = true
    const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
    expect(accessRestriction.options['foo-option-2'].value).toBe(true)
  })
})
