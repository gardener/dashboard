//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  mapAccessRestrictionForInput
} from '@/store'

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
