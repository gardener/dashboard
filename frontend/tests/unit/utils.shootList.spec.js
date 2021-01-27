//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { sortShoots } from '@/utils/shootList'
const { noop } = require('lodash')

let shootItems
const storeGetters = {
  ticketsLabels: undefined,
  shootCustomFields: {
    Z_Foo: {
      path: 'metadata.namespace'
    }
  },
  shootCustomFieldList: undefined,
  latestUpdatedTicketByNameAndNamespace: undefined
}
describe('utils.shootList', () => {
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
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot2')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by purpose', () => {
    const sortBy = ['purpose']
    const sortDesc = [true]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by creationTimestamp', () => {
    const sortBy = ['creationTimestamp']
    const sortDesc = [false]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot1')
    expect(sortedShoots[1].metadata.name).toBe('shoot2')
    expect(sortedShoots[2].metadata.name).toBe('shoot3')
  })

  it('should sort shoots by kubernetes version', () => {
    const sortBy = ['k8sVersion']
    const sortDesc = [false]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot1')
  })

  it('should sort shoots by infrastructure', () => {
    const sortBy = ['infrastructure']
    const sortDesc = [true]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot1')
    expect(sortedShoots[1].metadata.name).toBe('shoot3')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })

  it('should sort shoots by lastOperation (status)', () => {
    const sortBy = ['lastOperation']
    const sortDesc = [true]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot2')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot3')
  })

  it('should sort shoots by readiness', () => {
    const sortBy = ['readiness']
    const sortDesc = [false]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })

  it('should sort shoots by readiness', () => {
    const sortBy = ['readiness']
    const sortDesc = [false]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })

  it('should sort shoots by custom column', () => {
    const sortBy = ['Z_Foo']
    const sortDesc = [false]
    const sortedShoots = sortShoots(storeGetters, shootItems, sortBy, sortDesc)

    expect(sortedShoots[0].metadata.name).toBe('shoot3')
    expect(sortedShoots[1].metadata.name).toBe('shoot1')
    expect(sortedShoots[2].metadata.name).toBe('shoot2')
  })
})