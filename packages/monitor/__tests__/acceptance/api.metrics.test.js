//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import promClient from 'prom-client'
import logger from '../../lib/logger.js'

describe('api', () => {
  describe('metrics', () => {
    let agent

    beforeAll(async () => {
      agent = await createAgent()
    })

    afterAll(() => {
      agent.close()
    })

    it('should return the metrics', async () => {
      const metricsText = [
        '# HELP some_example_metric_foo bar.',
        '# TYPE some_example_metric_foo bar',
        'some_example_metric_foo 0.42',
      ].join('\n')
      promClient.register.metrics.mockResolvedValue(metricsText)
      const res = await agent
        .get('/metrics')
        .expect('content-type', /^text\/plain/)
        .expect(200)

      expect(res.text).toEqual(metricsText)
    })

    it('should return "Not Found" if an unknown route is queried', async () => {
      const res = await agent
        .get('/unknown')
        .expect(404)

      expect(res.body).toEqual({
        message: 'No matching route: GET /unknown',
        status: 404,
      })
    })

    it('should return "Not Found" for non GET requests', async () => {
      const res = await agent
        .delete('/metrics')
        .expect(404)

      expect(res.body).toEqual({
        message: 'No matching route: DELETE /metrics',
        status: 404,
      })
    })

    it('should return "Internal Server Error" in case of an unforseen error', async () => {
      const error = new Error('Metrics error')
      promClient.register.metrics.mockRejectedValue(error)
      const res = await agent
        .get('/metrics')
        .expect(500)

      expect(res.body).toEqual({
        status: 500,
        message: error.message,
      })
      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })
})
