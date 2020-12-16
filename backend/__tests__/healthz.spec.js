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
  let getHealthzStub

  beforeEach(function () {
    getHealthzStub = jest.spyOn(dashboardClient.healthz, 'get').mockResolvedValue()
  })

  it('should successfully check transitive healthz', async function () {
    await healthCheck(true)
    expect(getHealthzStub).toBeCalledTimes(1)
  })

  it('should successfully check non-transitive healthz', async function () {
    await healthCheck(false)
    expect(getHealthzStub).not.toBeCalled()
  })

  it('should throw a HTTP Error', async function () {
    getHealthzStub.mockRejectedValue(createHttpError({ statusCode: 500, body: 'body' }))
    await expect(healthCheck(true)).rejects.toThrow(/^Kubernetes apiserver is not healthy.*\(Status code: 500\)/)
    expect(getHealthzStub).toBeCalledTimes(1)
  })

  it('should throw an Error', async function () {
    getHealthzStub.mockRejectedValue(new Error('Failed'))
    await expect(healthCheck(true)).rejects.toThrow(/^Could not reach Kubernetes apiserver/)
    expect(getHealthzStub).toBeCalledTimes(1)
  })
})
