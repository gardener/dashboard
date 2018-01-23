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
  describe('config.json', function () {
    /* eslint no-unused-expressions: 0 */

    it('should return the frontend configuration', function () {
      return chai.request(app)
        .get('/config.json')
        .then(res => {
          expect(res).to.have.status(200)
          expect(res).to.be.json
          expect(res.body).to.have.property('oidc').that.is.an('object')
          expect(res.body.oidc).to.have.property('client_id').that.is.equal('gardener')
        })
    })
  })
})
