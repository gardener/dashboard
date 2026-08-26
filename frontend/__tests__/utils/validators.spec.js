//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  unique,
  base64,
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
  })
})
