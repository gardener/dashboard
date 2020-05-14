//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import { splitCIDR } from '@/utils/createShoot'

describe('utils', function () {
  describe('createShoot', function () {
    describe('#splitCIDR', function () {
      it('should not split the cidr', function () {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 1)

        expect(splittedCidrs).to.be.an.instanceof(Array)
        expect(splittedCidrs).to.have.length(1)
        expect(splittedCidrs[0]).is.equal('10.250.0.0/16')
      })

      it('should split the cidr into 2 networks', function () {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 2)

        expect(splittedCidrs).to.be.an.instanceof(Array)
        expect(splittedCidrs).to.have.length(2)
        expect(splittedCidrs[0]).is.equal('10.250.0.0/17')
        expect(splittedCidrs[1]).is.equal('10.250.128.0/17')
      })

      it('should split the cidr into 4 networks', function () {
        const splittedCidrs = splitCIDR('10.0.128.0/19', 4)

        expect(splittedCidrs).to.be.an.instanceof(Array)
        expect(splittedCidrs).to.have.length(4)
        expect(splittedCidrs[0]).is.equal('10.0.128.0/21')
        expect(splittedCidrs[1]).is.equal('10.0.136.0/21')
        expect(splittedCidrs[2]).is.equal('10.0.144.0/21')
        expect(splittedCidrs[3]).is.equal('10.0.152.0/21')
      })

      it('should split the cidr into 5 networks', function () {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 5)

        expect(splittedCidrs).to.be.an.instanceof(Array)
        expect(splittedCidrs).to.have.length(5)
        expect(splittedCidrs[0]).is.equal('10.250.0.0/19')
        expect(splittedCidrs[1]).is.equal('10.250.32.0/19')
        expect(splittedCidrs[2]).is.equal('10.250.64.0/19')
        expect(splittedCidrs[3]).is.equal('10.250.96.0/19')
        expect(splittedCidrs[4]).is.equal('10.250.128.0/19')
      })

      it('should not break when zone count is zero', function () {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 0)

        expect(splittedCidrs).to.be.an.instanceof(Array)
        expect(splittedCidrs).to.have.length(0)
      })
    })
  })
})
