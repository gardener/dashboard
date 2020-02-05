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

'use strict'

const {
  getDashboarUrlPath
} = require('../lib/services/shoots')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  describe('shoots', function () {
    describe('#dashboarUrlPath', function () {
      it('should return dashboard URL path for kubernetes version < 1.16.0', async function () {
        expect(getDashboarUrlPath('1.14.0')).to.be.equals('/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/')
        expect(getDashboarUrlPath('1.15.1')).to.be.equals('/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/')
        expect(getDashboarUrlPath('1.15.9')).to.be.equals('/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/')
      })

      it('should return dashboard URL path for kubernetes version >= 1.16.0', async function () {
        expect(getDashboarUrlPath('1.16.0')).to.be.equals('/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/')
        expect(getDashboarUrlPath('1.16.1')).to.be.equals('/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/')
        expect(getDashboarUrlPath('1.17.0')).to.be.equals('/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/')
        expect(getDashboarUrlPath('v1.17.0')).to.be.equals('/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/')
      })

      it('should return no dashboard URL path', async function () {
        expect(getDashboarUrlPath(undefined)).to.be.undefined
      })
    })
  })
})
