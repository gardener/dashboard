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

'use strict'

const _ = require('lodash')
const common = require('../support/common')

describe('gardener', function () {
  describe('api', function () {
    describe('domains', function () {
    /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const sandbox = sinon.createSandbox()
      const email = 'john.doe@example.org'
      let app

      before(function () {
        app = global.createServer()
      })

      after(function () {
        app.close()
      })

      afterEach(function () {
        verifyAndRestore(sandbox)
      })

      it('should return all domains', function () {
        common.stub.getDomains(sandbox)
        const bearer = oidc.sign({email})
        oidc.stub.getKeys()
        return chai.request(app)
          .get('/api/domains')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(2)
            let predicate = item => item.metadata.name === 'provider1-default-domain'
            expect(_.find(res.body, predicate).data.domain).to.eql('domain1')
            expect(_.find(res.body, predicate).data.provider).to.eql('provider1')
            predicate = item => item.metadata.name === 'provider2-default-domain'
            expect(_.find(res.body, predicate).data.domain).to.eql('domain2')
            expect(_.find(res.body, predicate).data.provider).to.eql('provider2')
          })
      })
    })
  })
})
