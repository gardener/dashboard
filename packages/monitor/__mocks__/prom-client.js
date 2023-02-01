//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const prometheus = jest.requireActual('prom-client')

const contentType = 'text/plain; version=0.0.4; charset=utf-8; mock=true'

const mockRegistry = {
  contentType,
  registerMetric: jest.fn(),
  metrics: jest.fn(),
  clear: jest.fn()
}

module.exports = {
  ...prometheus,
  contentType,
  mockRegistry,
  collectDefaultMetrics: jest.fn(),
  linearBuckets: jest.fn().mockImplementation(() => {
    return [42]
  }),
  Registry: jest.fn().mockReturnValue(mockRegistry)
}
