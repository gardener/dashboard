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

const { version } = require('../../package')

describe('gardener', function () {
  describe('api', function () {
    describe('info', function () {
      /* eslint no-unused-expressions: 0 */

      const oidc = nocks.oidc
      const email = 'john.doe@example.org'
      let app

      before(function () {
        app = global.createServer()
      })

      after(function () {
        app.close()
      })

      afterEach(function () {
        verifyAndRestore()
      })

      it('should reject requests without authorization header', async function () {
        return chai.request(app)
          .get('/api/info')
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(401)
            expect(res).to.be.json
            expect(res.body.error).to.have.property('name').that.is.equal('UnauthorizedError')
            expect(res.body.message).to.include('authorization token')
          })
      })

      it('should reject requests with invalid signature', function () {
        const bearer = oidc.sign({email}, true)
        oidc.stub.getKeys()
        return chai.request(app)
          .get('/api/info')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(401)
            expect(res).to.be.json
            expect(res.body.error).to.have.property('name').that.is.equal('SigningKeyNotFoundError')
            expect(res.body.message).to.include('signing key')
          })
      })

      it('should reject requests with invalid audience', function () {
        const aud = ['garden']
        const bearer = oidc.sign({email, aud})
        oidc.stub.getKeys()
        return chai.request(app)
          .get('/api/info')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(401)
            expect(res).to.be.json
            expect(res.body.error).to.have.property('name').that.is.equal('UnauthorizedError')
            expect(res.body.message).to.include('audience invalid')
          })
      })

      it('should reject requests with invalid issuer', function () {
        oidc.stub.getKeys()
        const iss = 'http://localhost:5556/identity'
        const bearer = oidc.sign({email, iss})
        return chai.request(app)
          .get('/api/info')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(401)
            expect(res).to.be.json
            expect(res.body.error).to.have.property('name').that.is.equal('UnauthorizedError')
            expect(res.body.message).to.include('issuer invalid')
          })
      })

      it('should accept requests with valid bearer', function () {
        const bearer = oidc.sign({email})
        oidc.stub.getKeys()
        return chai.request(app)
          .get('/api/info')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.property('version').that.is.equal(version)
            expect(res.body).to.have.property('user').that.is.an('object')
            expect(res.body.user).to.have.property('email').that.is.equal(email)
          })
      })
    })
  })
})
