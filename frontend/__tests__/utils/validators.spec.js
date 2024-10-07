//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { unique } from '@/utils/validators'

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
  })
})
