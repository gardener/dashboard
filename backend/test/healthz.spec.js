//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createHttpError } = require('@gardener-dashboard/request')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const { healthCheck } = require('../lib/healthz')

describe('healthz', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()
  const healthz = dashboardClient.healthz
  let getHealthzStub

  beforeEach(function () {
    getHealthzStub = sandbox.stub(healthz, 'get')
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should successfully check transitive healthz', async function () {
    await healthCheck(true)
    expect(getHealthzStub).to.be.calledOnce
  })

  it('should successfully check non-transitive healthz', async function () {
    await healthCheck(false)
    expect(getHealthzStub).not.to.be.called
  })

  it('should throw a HTTP Error', async function () {
    getHealthzStub.throws(createHttpError({ statusCode: 500, body: 'body' }))
    try {
      await healthCheck(true)
    } catch (err) {
      expect(err.message).to.match(/^Kubernetes apiserver is not healthy/)
      expect(err.message).to.match(/(Status code: 500)/)
    }
    expect(getHealthzStub).to.be.calledOnce
  })

  it('should throw an Error', async function () {
    getHealthzStub.throws(new Error('Failed'))
    try {
      await healthCheck(true)
    } catch (err) {
      expect(err.message).to.match(/^Could not reach Kubernetes apiserver/)
    }
    expect(getHealthzStub).to.be.calledOnce
  })
})
