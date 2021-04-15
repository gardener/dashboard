//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import './matchMedia.mock' // Must be imported before the tested file
import {
  mapAccessRestrictionForInput
} from '@/store'

import getters from '@/store/modules/shoots/getters'

describe('store.shoots.getters', () => {
  let shootItems
  const rootGetters = {
    ticketsLabels: undefined,
    shootCustomFields: {
      Z_Foo: {
        path: 'metadata.namespace'
      }
    },
    shootCustomFieldList: undefined,
    latestUpdatedTicketByNameAndNamespace: undefined
  }
  const sortItems = getters.sortItems(undefined, undefined, undefined, rootGetters)

  beforeEach(() => {
    shootItems = [
      {
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
      {
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
      {
        metadata: {
          name: 'shoot3',
          namespace: 'bar'
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
              status: 'False',
              lastTransitionTime: '2020-01-01T20:00:00Z'
            }
          ]
        }
      }
    ]
  })

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
