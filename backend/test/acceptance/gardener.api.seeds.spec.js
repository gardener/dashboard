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

'use strict'

const app = require('../../lib/app')

describe('gardener', function () {
  describe('api', function () {
    describe('seeds', function () {
    /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const email = 'john.doe@example.org'

      afterEach(function () {
        nocks.reset()
      })

      it('should return all seeds', function () {
        const bearer = oidc.sign({email})
        oidc.stub.getKeys()
        k8s.stub.getSeeds()
        return chai.request(app)
          .get('/api/seeds')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
          })
          .finally(() => nocks.verify())
      })
    })
  })
})
