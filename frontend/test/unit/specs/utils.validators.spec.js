//
// Copyright 2018 by The Gardener Authors.
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

import {unique, serviceAccountKey} from '@/utils/validators'

describe('utils', function () {
  describe('validators', function () {
    const parentVm = {
      keys: [1, 2, 3, false]
    }
    describe('#unique', function () {
      it('should not validate duplicate values', function () {
        expect(unique('keys')(3, parentVm)).to.be.false
      })
      it('should validate unique values', function () {
        expect(unique('keys')(0, parentVm)).to.be.true
      })
    })

    describe('#serviceAccountKey', function () {
      it('should not validate invalid JSON', function () {
        expect(serviceAccountKey('{"valid": false')).to.be.false
      })
      it('should not validate valid JSON with invalid project_id', function () {
        expect(serviceAccountKey('{"project_id": "inval!dProjectId"}')).to.be.false
      })
      it('should validate valid JSON with project_id', function () {
        expect(serviceAccountKey('{"project_id": "val1d-Pr0ject_ID"}')).to.be.true
      })
    })
  })
})
