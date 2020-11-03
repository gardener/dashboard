//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { version } = require('../../package')

module.exports = function info ({ agent, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'john.doe@example.org'
  const id = username
  const aud = ['gardener']

  it('should reject requests csrf protection error', async function () {
    const res = await agent
      .post('/api/info')
      .unset('x-requested-with')

    expect(res).to.have.status(403)
    expect(res).to.be.json
    expect(res.body.reason).to.equal('Forbidden')
    expect(res.body.details).to.have.property('name').that.is.equal('ForbiddenError')
    expect(res.body.message).to.include('CSRF protection')
  })

  it('should reject requests without authorization header', async function () {
    const res = await agent
      .get('/api/info')

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.reason).to.equal('Unauthorized')
    expect(res.body.details).to.have.property('name').that.is.equal('UnauthorizedError')
    expect(res.body.message).to.include('authorization token')
  })

  it('should reject requests with invalid signature', async function () {
    const user = auth.createUser({ id, aud }, true)
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.reason).to.equal('Unauthorized')
    expect(res.body.details).to.have.property('name').that.is.equal('UnauthorizedError')
    expect(res.body.message).to.include('invalid signature')
  })

  it('should reject requests with invalid audience', async function () {
    const user = auth.createUser({ id, aud: ['invalid-audience'] })
    const res = await agent
      .get('/api/info')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(401)
    expect(res).to.be.json
    expect(res.body.reason).to.equal('Unauthorized')
    expect(res.body.details).to.have.property('name').that.is.equal('UnauthorizedError')
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
    expect(res.body).not.to.have.property('user')
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
    expect(res.body).not.to.have.property('user')
  })
}
