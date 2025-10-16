//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const dashboardClient = {
  healthz: {
    get: jest.fn(),
  },
}

jest.mock('@gardener-dashboard/kube-client', () => ({
  createDashboardClient: jest.fn(() => dashboardClient),
}))

describe('healthz', function () {
  const { createHttpError } = require('@gardener-dashboard/request')
  const { healthCheck } = require('../dist/lib/healthz')

  const healthz = dashboardClient.healthz

  afterEach(() => {
    healthz.get.mockClear()
  })

  it('should successfully check transitive healthz', async function () {
    await healthCheck(true)
    expect(healthz.get).toHaveBeenCalledTimes(1)
  })

  it('should successfully check non-transitive healthz', async function () {
    await healthCheck(false)
    expect(healthz.get).not.toHaveBeenCalled()
  })

  it('should throw a HTTP Error', async function () {
    healthz.get.mockRejectedValue(createHttpError({ statusCode: 500, body: 'body' }))
    await expect(healthCheck(true)).rejects.toThrow(/^Kubernetes apiserver is not healthy.*\(Status code: 500\)/)
    expect(healthz.get).toHaveBeenCalledTimes(1)
  })

  it('should throw an Error', async function () {
    healthz.get.mockRejectedValue(new Error('Failed'))
    await expect(healthCheck(true)).rejects.toThrow(/^Could not reach Kubernetes apiserver/)
    expect(healthz.get).toHaveBeenCalledTimes(1)
  })
})
