//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { unique, serviceAccountKey } from '@/utils/validators'

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

    describe('#serviceAccountKey', () => {
      it('should not validate invalid JSON', () => {
        expect(serviceAccountKey.$validator('{"valid": false')).toBe(false)
      })
      it('should not validate valid JSON with invalid project_id', () => {
        expect(serviceAccountKey.$validator('{"project_id": "inval!dProjectId"}')).toBe(false)
      })
      it('should validate valid JSON with project_id', () => {
        expect(serviceAccountKey.$validator('{"project_id": "val1d-Pr0ject_ID"}')).toBe(true)
      })
    })
  })
})
