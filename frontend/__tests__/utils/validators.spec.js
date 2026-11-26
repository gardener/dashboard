//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  unique,
  base64,
  isDnsSubdomainName,
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
    describe('#isDnsSubdomainName', () => {
      it('applies the length limit to the whole Kubernetes name', () => {
        const name = `${'a'.repeat(250)}.bc`
        expect(isDnsSubdomainName(name)).toBe(true)
        expect(isDnsSubdomainName(name + 'd')).toBe(false)
      })

      it.each(['a..b', 'a-.b', 'a.-b'])('rejects invalid segments in %s', name => {
        expect(isDnsSubdomainName(name)).toBe(false)
      })
    })
  })
})
