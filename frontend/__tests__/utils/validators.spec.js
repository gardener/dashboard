//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  base64,
  messageFromErrors,
  unique,
  withFieldMetadata,
} from '@/utils/validators'

describe('utils', () => {
  describe('validators', () => {
    const parentVm = {
      keys: [1, 2, 3, false],
    }
    describe('#unique', () => {
      it('should not validate duplicate values', () => {
        expect(unique('keys').$validator.call(parentVm, 3)).toBe(false)
      })
      it('should validate unique values', () => {
        expect(unique('keys').$validator.call(parentVm, 0)).toBe(true)
      })
    })
    describe('#base64', () => {
      it.each([
        'YWJjZA==',
        'YWJj',
        '',
      ])('validates %j', value => {
        expect(base64.$validator(value)).toBe(true)
      })

      it.each([
        'a',
        'YWJjZA=',
        'invalid%',
      ])('rejects %j', value => {
        expect(base64.$validator(value)).toBe(false)
      })
    })
    describe('#withFieldMetadata', () => {
      it('adds structured display metadata to every validator', () => {
        const validators = withFieldMetadata({
          fieldName: 'Machine Type',
          fieldContext: 'Worker Group worker-one',
        }, {
          required: value => Boolean(value),
        })

        expect(validators.required.$params).toEqual({
          fieldName: 'Machine Type',
          fieldContext: 'Worker Group worker-one',
        })
      })
    })
    describe('#messageFromErrors', () => {
      const errors = [{
        $params: {
          fieldName: 'Machine Type',
          fieldContext: 'Worker Group worker-one',
        },
        $message: 'Value is required',
      }]

      it('includes field context by default', () => {
        expect(messageFromErrors(errors)).toBe(
          '[Worker Group worker-one] Machine Type: Value is required',
        )
      })

      it('can omit field context for local messages', () => {
        expect(messageFromErrors(errors, { includeFieldContext: false })).toBe(
          'Machine Type: Value is required',
        )
      })
    })
  })
})
