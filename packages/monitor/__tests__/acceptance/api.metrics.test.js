//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('prom-client')
jest.mock('@gardener-dashboard/logger')

const prometheus = require('prom-client')
const { mockLogger } = require('@gardener-dashboard/logger')
const metrics = require('../../lib/metrics')

describe('api', () => {
  describe('metrics', () => {
    let agent

    beforeAll(() => {
      agent = createAgent()
    })

    afterAll(() => {
      agent.close()
    })

    it('should return the metrics', async () => {
      const metricsValue = [
        '# HELP some_example_metric_foo bar.',
        '# TYPE some_example_metric_foo bar',
        'some_example_metric_foo 0.42'
      ].join('\n')
      prometheus.mockRegistry.metrics.mockReturnValue(metricsValue)
      metrics.start()
      const res = await agent.get('/metrics')

      expect(res.status).toEqual(200)
      expect(res.text).toEqual(metricsValue)
      expect(res.headers['content-type']).toEqual(prometheus.contentType)
    })

    it('should return "Not Found" if an unknown route is queried', async () => {
      const res = await agent.get('/unknown')
      expect(res.status).toEqual(404)
    })

    it('should return "Method Not Allowed" for non GET requests', async () => {
      const res = await agent.delete('/metrics')
      expect(res.status).toEqual(405)
      expect(res.headers.allow).toEqual('GET')
    })

    it('should return "Internal Server Error" in case of an unforseen error', async () => {
      prometheus.mockRegistry.metrics.mockImplementation(() => {
        throw Error('Mock Error')
      })
      const res = await agent.get('/metrics')
      expect(res.status).toEqual(500)
      expect(res.text).toEqual('Internal Server Error')
      expect(mockLogger.error).toBeCalledTimes(1)
    })
  })
})
