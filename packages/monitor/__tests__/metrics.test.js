//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('prom-client')
const prometheus = require('prom-client')
const metrics = require('../lib/metrics')

describe('metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should export registries contentType', () => {
    expect(metrics.contentType).toEqual(prometheus.mockRegistry.contentType)
  })

  it('should add default metrics on start', () => {
    metrics.start()
    expect(prometheus.collectDefaultMetrics).toHaveBeenCalledTimes(1)
    expect(prometheus.collectDefaultMetrics).toHaveBeenCalledWith({ register: prometheus.mockRegistry })
  })

  it('should call the registries metrics function', () => {
    metrics.getMetrics()
    expect(prometheus.mockRegistry.metrics).toHaveBeenCalledTimes(1)
  })

  it('should clear the registries metrics on stop', () => {
    metrics.stop()
    expect(prometheus.mockRegistry.clear).toHaveBeenCalledTimes(1)
  })

  it('should create and export the application defined metrics', () => {
    expect(metrics.metrics).toMatchSnapshot()
  })
})
