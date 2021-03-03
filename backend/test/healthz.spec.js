//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createHttpError } = require('@gardener-dashboard/request')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const { healthCheck } = require('../lib/healthz')

describe('healthz', function () {
  const healthz = dashboardClient.healthz

  beforeEach(function () {
    healthz.get = jest.fn()
  })

  it('should successfully check transitive healthz', async function () {
    await healthCheck(true)
    expect(healthz.get).toBeCalledTimes(1)
  })

  it('should successfully check non-transitive healthz', async function () {
    await healthCheck(false)
    expect(healthz.get).not.toBeCalled()
  })

  it('should throw a HTTP Error', async function () {
    healthz.get.mockRejectedValue(createHttpError({ statusCode: 500, body: 'body' }))
    await expect(healthCheck(true)).rejects.toThrow(/^Kubernetes apiserver is not healthy.*\(Status code: 500\)/)
    expect(healthz.get).toBeCalledTimes(1)
  })

  it('should throw an Error', async function () {
    healthz.get.mockRejectedValue(new Error('Failed'))
    await expect(healthCheck(true)).rejects.toThrow(/^Could not reach Kubernetes apiserver/)
    expect(healthz.get).toBeCalledTimes(1)
  })
})
