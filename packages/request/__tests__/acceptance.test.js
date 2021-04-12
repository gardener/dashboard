//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const http2 = require('http2')
const { promisify } = require('util')
const typeis = require('type-is')
const { Client, Agent, isHttpError } = require('../lib')

const {
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH
} = http2.constants

jest.useFakeTimers()

const key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxLZ88tEBAu9ij
OTqB7qHT1mx5O8R+j+fgTkQVZU7dVvLcWpC+rfM2avVKlPNLBcKw0Ke+yrZYZdUo
ALho8dhQ55TUQBBf6Kq0Aneajexd5eVxC1FGwgqPcBwynkO/NJeDf63AzWvB3p4H
ggcEw6L4U4MDH8WBgPW5YK7XI9R0yp/Fb23TaAL3/rO2VvsTP3cnh7jX+oiZ8Rli
060J4pmAkNXFFn+HMbx7aDWg8vLt2rs8pYHioWhGrtAjeuKsZ3UB9Z41Cv4XblSv
NNBljBcXAiqgrU9W3m5w0U+onKxWL3YtIZHWtPKMDmGT7mbcd1XDQaPWPYKa8mIn
Ppa1qePzAgMBAAECggEAJzCQKD02eRsTsAbYiiTeZpznIWm27Men4lVtec4Ow6aX
0WW23nZbdY3y86w+pDmB9towQGNWMfdUTqTaJVxZHIwcv1XsSUqNd4OUMPtzbNGN
DpQSRjRlYZTKp+eZ1JEtckirhhnp29gB3GdGZidfxM20DNzaMurzby2TfsLOG4bX
0B9ADIKwpqYPrghoOFuorOtSec1kUCHjTpke4c9HKIZO/pAmNV26ZMovZuVLgB/L
73QhISe51UHQFvGysz8f5aW/YuNzwHbaOc29GzX6wB7k/z1PxyGZ0GyLq1BoXpVO
TFmy3uU/6ykrquwrsmJyy1RV2EKKEeL4/soqhg8DAQKBgQDa0sUgCOsC4i/vW/AG
uaQfCclUUg11luY0Jy/o0fHnVUeknl4+mZ54tvwdPX+hQ3xUwgp7f7U0baPiHrMN
mNaESN4FVAkxm86mSvBmYJxQZ5ZzhlaPSZQKEnJIvDzWwO6LB7mFho76ESMg8S9c
iJ55tTdFHXjlfxc7Z4aUxtvzNQKBgQDPR5deiXNxgnmavpGCv0KaFXqWunwVUOt4
cEJT2VCbtYC5Qm0CGiZ7q3nd4RtmerL0nsWuaq2QBBGd5juDC+ehhZECZ3SvBwV/
MUQCcasCMqQjEvOWuDcpRxbCr/nDzK0xwc3IoRmPE+gGEsjQJUHhdnZJlv7HsoNd
iNiewAN3hwKBgQDBEED32KZwrtuYFceaR2P0NpA5IwPZAcAtt31frwv9DJLfPRLt
rF/TJa8epUncIEysA194Qt6/WRTExk036+coY5nvnYtXB561vVyJFygTELH/T0FD
vqkskcXfQqVy3FoatEAM/QFcxI333JPq0mbv/uC6zBwEb7MxqE9nKGSbGQKBgQCb
fF+O2dqQVkh0DOnIQ0JppR0NPhxgPRA1izgl/8kY1IEX9z0gK4+ci1fiWb8dE4N0
PjmZiYpikrrIUHFp7x81KaVKQWLk/IZiEAmtL6kQ//3iFZBGCi/OtfXb2venqbxt
q6x7CGXMzyjojWS3xorx3tQChdLe6AjkvAeKpgyztwKBgGgpT+DPM+qrGDOAbmCU
B+52febCxuJLSzNj9PCe7it7dxqPHGrJLJKTosCfBQHJ+1Qtwx8gGcAIKzmcurnI
3fxrwExIxFQVcbUrdxMVj51uHrJnLcW3g+kdL2x9sMd0Yp36uHg1iFar/2TYStLv
lF9xKvconfKxPjAj8jNGkryI
-----END PRIVATE KEY-----` // ggignore

const cert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQD+Huizwl4icTANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjEwMzAyMTM1MjQ2WhcNMzEwMjI4MTM1MjQ2WjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCx
LZ88tEBAu9ijOTqB7qHT1mx5O8R+j+fgTkQVZU7dVvLcWpC+rfM2avVKlPNLBcKw
0Ke+yrZYZdUoALho8dhQ55TUQBBf6Kq0Aneajexd5eVxC1FGwgqPcBwynkO/NJeD
f63AzWvB3p4HggcEw6L4U4MDH8WBgPW5YK7XI9R0yp/Fb23TaAL3/rO2VvsTP3cn
h7jX+oiZ8Rli060J4pmAkNXFFn+HMbx7aDWg8vLt2rs8pYHioWhGrtAjeuKsZ3UB
9Z41Cv4XblSvNNBljBcXAiqgrU9W3m5w0U+onKxWL3YtIZHWtPKMDmGT7mbcd1XD
QaPWPYKa8mInPpa1qePzAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABRHmZIq1tC0
MAH6nfHyHAVoDSB1QdQSyupqaTM5/3yjJZM65fbhJM9xKY94GhpSf0L1rZ9plBOW
ATTe5XmuuI9mPiPup7qovGAtIDTewj6GVTI82puCIAV7V1q8uSeLHhO9SWWpcMqi
HaCbcKIUus1osirh2EGgmRDjOpJAhvHMSP5pzMUhcmiOOGe2f8oLvkMSJfysoip4
/iOLT4ZY9UoITEAxSHIUin1ljV4AdWVyHkq/OW3aTmrZF+DgQ95dRrhCjjnVYDSM
aHs7OnRXTyU85lW+uHJjWseni4J0R/SmHM2ZJFnlODcCBLwYYWZpBEFCQ40LLSbI
GNw5Orfw8xY=
-----END CERTIFICATE-----`

function createSecureServer ({ cert, key }) {
  const protocol = 'https:'
  const hostname = 'localhost'
  return new Promise((resolve, reject) => {
    const server = http2.createSecureServer({ cert, key })
    server.close = promisify(server.close)
    server.options = {
      hostname,
      protocol,
      port: 0
    }
    server.once('error', err => reject(err))
    server.on('stream', async (stream, headers) => {
      const path = headers[HTTP2_HEADER_PATH]
      const contentType = headers[HTTP2_HEADER_CONTENT_TYPE]
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      let body = Buffer.concat(chunks).toString('utf8')
      if (typeis.is(contentType, ['json']) === 'json') {
        body = JSON.parse(body)
      }
      let statusCode = 200
      if (path.startsWith('/status/')) {
        statusCode = +path.substring(8)
        body = http.STATUS_CODES[statusCode]
        stream.respond({
          [HTTP2_HEADER_STATUS]: statusCode,
          [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
          [HTTP2_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body)
        })
        stream.end(body)
      } else if (path.startsWith('/events/')) {
        stream.respond({
          [HTTP2_HEADER_STATUS]: statusCode,
          [HTTP2_HEADER_CONTENT_TYPE]: 'application/json'
        })
        const entries = Object.entries(path.substring(8))
        for (const [i, y] of entries) {
          await new Promise(resolve => process.nextTick(resolve))
          stream.write(JSON.stringify({ x: +i + 1, y }) + '\n')
        }
        stream.end()
      } else {
        body = JSON.stringify({
          headers,
          body
        })
        stream.respond({
          [HTTP2_HEADER_STATUS]: statusCode,
          [HTTP2_HEADER_CONTENT_TYPE]: 'application/json',
          [HTTP2_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body)
        })
        stream.end(body)
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const port = server.options.port = server.address().port
      server.origin = `${protocol}//${hostname}:${port}`
      resolve(server)
    })
  })
}

describe('Acceptance Tests', function () {
  let agent
  let client
  let server

  beforeEach(async () => {
    server = await createSecureServer({ cert, key })
    agent = new Agent({
      keepAliveTimeout: 3000,
      connectTimeout: 1500,
      pingInterval: false
    })
    client = new Client({
      prefixUrl: server.origin,
      agent,
      ca: cert
    })
  })

  afterEach(async () => {
    agent.destroy()
    await server.close()
  })

  describe('Client', function () {
    describe('#fetch', function () {
      it('should send a GET request', async function () {
        const method = 'GET'
        const headers = {
          [HTTP2_HEADER_AUTHORITY]: server.options.hostname + ':' + server.options.port,
          [HTTP2_HEADER_METHOD]: method,
          [HTTP2_HEADER_PATH]: '/echo',
          [HTTP2_HEADER_SCHEME]: 'https'
        }
        const url = new URL(headers[HTTP2_HEADER_SCHEME] + '://' + headers[HTTP2_HEADER_AUTHORITY] + headers[HTTP2_HEADER_PATH])
        const body = {
          headers,
          body: ''
        }
        const response = await client.fetch('echo')
        expect(response.ok).toBe(true)
        expect(response.redirected).toBe(false)
        expect(response.request.options).toEqual({
          body: undefined,
          headers,
          method,
          url
        })
        expect(response.contentType).toBe('application/json')
        expect(response.contentLength).toBe(JSON.stringify(body).length.toString())
        await expect(response.body()).resolves.toEqual(body)
      })
    })

    describe('#request', function () {
      it('should throw a HttpError', async function () {
        const statusCode = 418
        const statusMessage = http.STATUS_CODES[statusCode]
        const body = statusMessage
        const headers = {
          [HTTP2_HEADER_CONTENT_LENGTH]: body.length.toString(),
          [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain'
        }
        expect.assertions(2)
        try {
          await client.request('status/418')
        } catch (err) {
          /* eslint-disable jest/no-try-expect */
          expect(isHttpError(err, 418)).toBe(true)
          expect(err).toMatchObject({
            statusCode,
            statusMessage,
            headers,
            body
          })
        }
      })

      it('should send a GET request', async function () {
        const method = 'GET'
        await expect(client.request('echo')).resolves.toEqual({
          body: '',
          headers: {
            [HTTP2_HEADER_AUTHORITY]: server.options.hostname + ':' + server.options.port,
            [HTTP2_HEADER_METHOD]: method,
            [HTTP2_HEADER_PATH]: '/echo',
            [HTTP2_HEADER_SCHEME]: 'https'
          }
        })
      })

      it('should send a POST request', async function () {
        const method = 'POST'
        const json = { foo: 'bar' }
        const headers = {
          'X-Requested-With': 'XmlHttpRequest'
        }
        await expect(client.request('echo', { method, headers, json })).resolves.toEqual({
          body: json,
          headers: {
            [HTTP2_HEADER_AUTHORITY]: `${server.options.hostname}:${server.options.port}`,
            [HTTP2_HEADER_METHOD]: method,
            [HTTP2_HEADER_PATH]: '/echo',
            [HTTP2_HEADER_SCHEME]: 'https',
            'x-requested-with': 'XmlHttpRequest',
            [HTTP2_HEADER_CONTENT_TYPE]: 'application/json'
          }
        })
      })
    })

    describe('#stream', function () {
      it('should send a GET request', async function () {
        const stream = await client.stream('events/abcde')
        const events = []
        for await (const event of stream) {
          events.push(event)
        }
        expect(events).toEqual([
          { x: 1, y: 'a' },
          { x: 2, y: 'b' },
          { x: 3, y: 'c' },
          { x: 4, y: 'd' },
          { x: 5, y: 'e' }
        ])
      })
    })
  })
})
