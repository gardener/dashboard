//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

<<<<<<< HEAD
const { mockRequest } = require('@gardener-dashboard/request')

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  describe('controllerregistrations', function () {
    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    it('should return all gardener extensions', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      const res = await agent
        .get('/api/gardener-extensions')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toHaveLength(2)
      expect(res.body[0].name).toBe('foo')
      expect(res.body[0].version).toBe('v1.0.0')
    })
=======
const _ = require('lodash')
const common = require('../support/common')

module.exports = function ({ agent, sandbox, auth, k8s }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'john.doe@example.org'
  const id = username
  const user = auth.createUser({ id })

  it('should return all controller registrations', async function () {
    const bearer = await user.bearer

    common.stub.getControllerRegistrations(sandbox)
    k8s.stub.getControllerRegistrations({ bearer, verb: 'list' })

    const res = await agent
      .get('/api/controllerregistrations')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(2)
    expect(res.body[0]).to.include({ name: 'foo', version: 'v1.0.0' })
>>>>>>> PR Feedback #1
  })
<<<<<<< HEAD
})
=======

  it('should return all registered networking types', async function () {
    common.stub.getControllerRegistrations(sandbox)

    const res = await agent
      .get('/api/controllerregistrations/network-types')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(1)
    expect(res.body[0]).to.eql('NetworkType')
  })
}
>>>>>>> Added test for networking types endpoint
