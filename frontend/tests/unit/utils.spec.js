//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import { expect } from 'chai'
import { maskMiddle } from '@/utils'

describe('utils', function () {
  describe('#truncateMiddle', function () {
    const input = '1234567890'
    it('should mask the input', function () {
      expect(maskMiddle(input, 2, 3, '*')).to.equal('12*****890')
    })
    it('should mask the complete input', function () {
      expect(maskMiddle('a', 1, 0, '*')).to.equal('*')
      expect(maskMiddle(input, 5, 5, '*')).to.equal('**********')
      expect(maskMiddle(input, 0, 0, '*')).to.equal('**********')
    })
    it('should return undefined', function () {
      expect(maskMiddle('')).to.be.undefined
      expect(maskMiddle(undefined)).to.be.undefined
    })
  })
})
