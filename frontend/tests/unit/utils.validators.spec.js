//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { unique, serviceAccountKey } from '@/utils/validators'

describe('utils', () => {
  describe('validators', () => {
    const parentVm = {
      keys: [1, 2, 3, false]
    }
    describe('#unique', () => {
      it('should not validate duplicate values', () => {
        expect(unique('keys')(3, parentVm)).toBe(false)
      })
      it('should validate unique values', () => {
        expect(unique('keys')(0, parentVm)).toBe(true)
      })
    })

    describe('#serviceAccountKey', () => {
      it('should not validate invalid JSON', () => {
        expect(serviceAccountKey('{"valid": false')).toBe(false)
      })
      it('should not validate valid JSON with invalid project_id', () => {
        expect(serviceAccountKey('{"project_id": "inval!dProjectId"}')).toBe(false)
      })
      it('should validate valid JSON with project_id', () => {
        expect(serviceAccountKey('{"project_id": "val1d-Pr0ject_ID"}')).toBe(true)
      })
    })
  })
})
