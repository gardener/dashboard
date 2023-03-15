//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const promClient = jest.requireActual('prom-client')

const register = promClient.register

module.exports = {
  ...promClient,
  register: {
    ...register,
    contentType: register.contentType, // property not enumerable
    registerMetric: jest.fn(),
    metrics: jest.fn(),
    clear: jest.fn()
  },
  collectDefaultMetrics: jest.fn(),
  linearBuckets: jest.fn()
}
