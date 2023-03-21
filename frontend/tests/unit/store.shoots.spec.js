//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  mapAccessRestrictionForInput
} from '@/store'

import getters from '@/store/modules/shoots/getters'
import shootModule from '@/store/modules/shoots'

import { parseSearch, deleteItem, putItem, keyForShoot } from '@/store/modules/shoots/helper'

import assign from 'lodash/assign'
import fromPairs from 'lodash/fromPairs'
import map from 'lodash/map'

describe('store.shoots', () => {
  let shootItems
  const rootGetters = {
    shootCustomFields: {
      Z_Foo: {
        path: 'metadata.namespace'
      }
    },
    shootCustomFieldList: undefined
  }
  let state
  let sortItems
  let setFocusMode
  let rootState

  beforeEach(() => {
    shootItems = [
      {
        metadata: {
          name: 'shoot2',
          namespace: 'foo',
          uid: 'shoot2'
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
              type: 'ObservabilityComponentsHealthy',
              status: 'True',
              lastTransitionTime: '2020-03-01T20:00:00Z'
            },
            {
              type: 'ControlPlaneHealthy',
              status: 'False',
              lastTransitionTime: '2020-01-01T20:00:00Z'
            }
          ]
        }
      },
      {
        metadata: {
          name: 'shoot1',
          namespace: 'foo',
          uid: 'shoot1'
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
              type: 'APIServerAvailable',
              status: 'False',
              lastTransitionTime: '2022-02-01T20:00:00Z'
            }
          ]
        }
      },
      {
        metadata: {
          name: 'shoot3',
          namespace: 'bar',
          uid: 'shoot3'
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
              description: 'bar'
            }
          ],
          conditions: [
            {
              type: 'APIServerAvailable',
              status: 'False',
              lastTransitionTime: '2022-01-01T20:00:00Z'
            }
          ]
        }
      }
    ]

    const shootItemKeyValuePairs = map(shootItems, shootItem => [keyForShoot(shootItem.metadata), shootItem])
    state = {
      shoots: fromPairs(shootItemKeyValuePairs),
      filteredShoots: shootItems,
      focusMode: false,
      staleShoots: []
    }
    assign(shootModule.state, state)

    rootState = {
      wellKnownConditions: {
        APIServerAvailable: {
          sortOrder: '0'
        }
      }
    }

    sortItems = getters.sortItems(shootModule.state, getters, rootState, rootGetters)
    setFocusMode = (value) => shootModule.actions.setFocusMode({
      commit: (f, v) => shootModule.mutations[f](shootModule.state, v),
      getters: {
        sortItems
      }
    }, value)
  })

  describe('getters', () => {
    it('should sort shoots by name', () => {
      const sortBy = ['name']
      const sortDesc = [true]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot3')
      expect(sortedShoots[1].metadata.name).toBe('shoot2')
      expect(sortedShoots[2].metadata.name).toBe('shoot1')
    })

    it('should sort shoots by purpose', () => {
      const sortBy = ['purpose']
      const sortDesc = [true]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot2')
      expect(sortedShoots[1].metadata.name).toBe('shoot3')
      expect(sortedShoots[2].metadata.name).toBe('shoot1')
    })

    it('should sort shoots by creationTimestamp', () => {
      const sortBy = ['creationTimestamp']
      const sortDesc = [false]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot1')
      expect(sortedShoots[1].metadata.name).toBe('shoot2')
      expect(sortedShoots[2].metadata.name).toBe('shoot3')
    })

    it('should sort shoots by kubernetes version', () => {
      const sortBy = ['k8sVersion']
      const sortDesc = [false]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot2')
      expect(sortedShoots[1].metadata.name).toBe('shoot3')
      expect(sortedShoots[2].metadata.name).toBe('shoot1')
    })

    it('should sort shoots by infrastructure', () => {
      const sortBy = ['infrastructure']
      const sortDesc = [true]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot1')
      expect(sortedShoots[1].metadata.name).toBe('shoot3')
      expect(sortedShoots[2].metadata.name).toBe('shoot2')
    })

    it('should sort shoots by lastOperation (status)', () => {
      const sortBy = ['lastOperation']
      const sortDesc = [true]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot2')
      expect(sortedShoots[1].metadata.name).toBe('shoot1')
      expect(sortedShoots[2].metadata.name).toBe('shoot3')
    })

    it('should sort shoots by readiness', () => {
      const sortBy = ['readiness']
      const sortDesc = [false]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot3')
      expect(sortedShoots[1].metadata.name).toBe('shoot1')
      expect(sortedShoots[2].metadata.name).toBe('shoot2')
    })

    it('should sort shoots by custom column', () => {
      const sortBy = ['Z_Foo']
      const sortDesc = [false]
      const sortedShoots = sortItems(shootItems, sortBy, sortDesc)

      expect(sortedShoots[0].metadata.name).toBe('shoot3')
      expect(sortedShoots[1].metadata.name).toBe('shoot1')
      expect(sortedShoots[2].metadata.name).toBe('shoot2')
    })

    it('should mark no longer existing shoots as stale when shoot list is freezed', () => {
      deleteItem(shootModule.state, shootModule.state.filteredShoots[0])
      shootModule.state.filteredShoots = Object.values(shootModule.state.shoots)
      expect(shootModule.state.filteredShoots.length).toBe(2)
      expect(shootModule.getters.filteredItems(shootModule.state).length).toBe(2)
      expect(shootModule.getters.filteredItems(shootModule.state)[0].stale).toBe(undefined)
      setFocusMode(true)

      expect(shootModule.getters.filteredItems(shootModule.state)[0].stale).toBe(undefined)
      deleteItem(shootModule.state, shootModule.state.filteredShoots[0])
      shootModule.state.filteredShoots = Object.values(shootModule.state.shoots)
      expect(shootModule.state.filteredShoots.length).toBe(1)

      expect(shootModule.getters.filteredItems(shootModule.state).length).toBe(2)
      expect(shootModule.getters.filteredItems(shootModule.state)[0].stale).toBe(true)
    })

    it('should not add new shoots to list when shoot list is freezed', () => {
      setFocusMode(true)
      const newShoot = {
        metadata: {
          name: 'shoot4',
          namespace: 'foo',
          uid: 'shoot4'
        }
      }
      shootModule.state.shoots[keyForShoot(newShoot.metadata)] = newShoot
      shootModule.state.filteredShoots = Object.values(shootModule.state.shoots)
      expect(shootModule.state.filteredShoots.length).toBe(4)
      expect(shootModule.state.sortedUidsAtFreeze.length).toBe(3)

      expect(getters.filteredItems(shootModule.state).length).toBe(3)

      setFocusMode(false)
      expect(getters.filteredItems(shootModule.state).length).toBe(4)

      setFocusMode(true)
      expect(getters.filteredItems(shootModule.state).length).toBe(4)
    })

    it('should add and remove staleShoots', () => {
      const shoot = Object.values(shootModule.state.shoots)[1]
      setFocusMode(true)

      deleteItem(shootModule.state, shoot)
      expect(shootModule.state.staleShoots[shoot.metadata.uid]).not.toBeUndefined()

      putItem(shootModule.state, shoot)
      expect(shootModule.state.staleShoots[shoot.metadata.uid]).toBeUndefined()
    })
  })

  describe('mutations', () => {
    it('should receive items and update staleShoots', () => {
      const shoots = Object.values(shootModule.state.shoots)
      setFocusMode(true)
      const itemToDelete = shoots[0]
      deleteItem(shootModule.state, itemToDelete)

      expect(shootModule.state.sortedUidsAtFreeze.length).toBe(3)
      expect(shootModule.state.staleShoots[itemToDelete.metadata.uid]).not.toBeUndefined()
      expect(Object.values(shootModule.state.shoots).length).toBe(2)
      expect(Object.values(shootModule.state.shoots)).toContain(shoots[1], shoots[2])

      const newShoots = [shoots[0], shoots[1]]
      const missingShoot = shoots[2]
      shootModule.mutations.RECEIVE(shootModule.state, { rootState: {}, rootGetters: {}, shoots: newShoots })

      expect(shootModule.state.sortedUidsAtFreeze.length).toBe(3)
      expect(shootModule.state.staleShoots[missingShoot.metadata.uid]).not.toBeUndefined()
      expect(shootModule.state.staleShoots[itemToDelete.metadata.uid]).toBeUndefined()
      expect(Object.values(shootModule.state.shoots).length).toBe(2)
      expect(Object.values(shootModule.state.shoots)).toContain(shoots[0], shoots[1])
    })
  })
})

describe('store.AccessRestrictions', () => {
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

describe('store.shoots.helper', () => {
  describe('#parseSearch', () => {
    it('should parse search text', () => {
      const searchQuery = parseSearch('a "b""s" -"c" -d')
      expect(searchQuery.terms).toEqual([
        {
          exact: false,
          exclude: false,
          value: 'a'
        },
        {
          exact: true,
          exclude: false,
          value: 'b"s'
        },
        {
          exact: true,
          exclude: true,
          value: 'c'
        },
        {
          exact: false,
          exclude: true,
          value: 'd'
        }
      ])
    })

    it('should match values correctly', () => {
      const searchQuery = parseSearch('a "b""s" -"c" -d')
      expect(searchQuery.matches(['$a', 'b"s', '$c'])).toBe(true)
      expect(searchQuery.matches(['$a', 'b"s', '$d'])).toBe(false)
      expect(searchQuery.matches(['$a', 'b"s', 'c'])).toBe(false)
      expect(searchQuery.matches(['$a', '$b"s'])).toBe(false)
      expect(searchQuery.matches(['b"s'])).toBe(false)
    })
  })
})
