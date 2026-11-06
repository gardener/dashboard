//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import express from 'express'
import request from 'supertest'
import logger from '../lib/logger/index.js'
import { requestLogger } from '../lib/middleware.js'

describe('middleware', function () {
  describe('requestLogger', function () {
    let app
    let logFormat
    let silent
    let console

    beforeEach(() => {
      logFormat = logger.logFormat
      silent = logger.silent
      console = logger.console
      logger.silent = false
      logger.console = {
        log: vi.fn(),
        info: vi.fn(),
      }
      app = express()
      app.use(requestLogger)
      app.get('/foo', (req, res) => res.send('bar'))
    })

    afterEach(() => {
      logger.setLogFormat(logFormat)
      logger.silent = silent
      logger.console = console
    })

    async function getLine (url) {
      await request(app).get(url).set('User-Agent', 'test').expect(200)
      expect(logger.console.info).toHaveBeenCalledTimes(1)
      return logger.console.info.mock.calls[0][0]
    }

    it('should write the access log as json record', async function () {
      logger.setLogFormat('json')
      const line = await getLine('/foo?a="b"&c=d')
      const record = JSON.parse(line)
      expect(record).toEqual({
        level: 'info',
        ts: expect.any(String),
        msg: 'GET /foo?a=%22b%22&c=d HTTP/1.1 200',
        remoteAddr: expect.any(String),
        method: 'GET',
        url: '/foo?a=%22b%22&c=d',
        httpVersion: '1.1',
        status: 200,
        contentLength: 3,
      })
      expect(line).not.toContain('\\')
    })

    it('should keep redacting sensitive query parameters in the json record', async function () {
      logger.setLogFormat('json')
      const record = JSON.parse(await getLine('/foo?code=secret&state=secret&other=value'))
      expect(record.url).toBe('/foo?code=REDACTED&state=REDACTED&other=value')
      expect(record.msg).not.toContain('secret')
    })

    it('should write the access log as common log line in text format', async function () {
      logger.setLogFormat('text')
      await request(app).get('/foo?code=secret').expect(200)
      expect(logger.console.info).not.toHaveBeenCalled()
      expect(logger.console.log).toHaveBeenCalledTimes(1)
      const [line] = logger.console.log.mock.calls[0]
      expect(line).toMatch(/\/foo\?code=REDACTED HTTP\/1\.1" 200 3/)
      expect(line).not.toContain('secret')
    })
  })
})
