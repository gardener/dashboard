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

module.exports = function info ({ agent }) {
  /* eslint no-unused-expressions: 0 */

  const auth = nocks.auth
  const k8s = nocks.k8s
  const username = 'john.doe@example.org'
  const id = username
  const aud = [ 'gardener' ]

  it('should reject requests csrf protection error', async function () {
    const res = await agent
      .post('/api/info')
      .unset('x-requested-with')

    expect(res).to.have.status(403)
    expect(res).to.be.json
    expect(res.body.error).to.have.property('name').that.is.equal('Forbidden')
    expect(res.body.message).to.include('CSRF protection')
  })

  it('should reject requests without authorization header', async function () {
    const res = await agent
      .get('/api/info')

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.error).to.have.property('name').that.is.equal('Unauthorized')
    expect(res.body.message).to.include('authorization token')
  })

  it('should reject requests with invalid signature', async function () {
    const user = auth.createUser({ id, aud }, true)
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.error).to.have.property('name').that.is.equal('Unauthorized')
    expect(res.body.message).to.include('invalid signature')
  })

  it('should reject requests with invalid audience', async function () {
    const user = auth.createUser({ id, aud: [ 'invalid-audience' ] })
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.error).to.have.property('name').that.is.equal('Unauthorized')
    expect(res.body.message).to.include('audience invalid')
  })

  it('should return information with version', async function () {
    const user = auth.createUser({ id, aud })
    const gardenerVersion = { major: '1', minor: '0' }
    k8s.stub.fetchGardenerVersion({ version: gardenerVersion })
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('version').that.is.equal(version)
    expect(res.body.gardenerVersion).to.have.property('major').that.is.equal(gardenerVersion.major)
    expect(res.body.gardenerVersion).to.have.property('minor').that.is.equal(gardenerVersion.minor)
    expect(res.body).to.have.property('user').that.is.an('object')
    expect(res.body.user).to.have.property('id').that.is.equal(id)
  })

  it('should return information without version', async function () {
    const user = auth.createUser({ id, aud })
    k8s.stub.fetchGardenerVersion({ version: undefined })
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('version').that.is.equal(version)
    expect(res.body).not.to.have.property('gardenerVersion')
    expect(res.body).to.have.property('user').that.is.an('object')
    expect(res.body.user).to.have.property('id').that.is.equal(id)
  })
}
