//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import http from 'http'
import { Test } from 'supertest'
import { pEvent } from 'p-event'
import ioClient from 'socket.io-client'
import { createTerminus } from '@godaddy/terminus'

export async function createHttpAgent () {
  const { default: app } = await import('../../lib/app.js')
  let server = http.createServer(app)
  const healthCheck = app.get('healthCheck')
  if (typeof healthCheck === 'function') {
    const signal = 'SIGTERM'
    const healthChecks = {
      '/healthz': () => healthCheck(false),
      '/healthz-transitive': () => healthCheck(true),
    }
    process.removeAllListeners(signal)
    server = createTerminus(server, { signal, healthChecks })
  }

  const agent = {
    server,
    close () {
      server.close()
    },
  }

  for (const method of ['get', 'put', 'patch', 'delete', 'post']) {
    agent[method] = function (url) {
      const test = new Test(server, method, url)
      test.set('x-requested-with', 'XMLHttpRequest')
      return test
    }
  }
  return agent
}

export async function createSocketAgent (cache) {
  const { default: createIo } = await import('../../lib/io/index.js')
  const server = http.createServer()
  const io = createIo(server, cache)
  server.listen(0, '127.0.0.1')

  const agent = {
    io,
    server,
    async close () {
      await new Promise(resolve => io.close(resolve))
      await new Promise(resolve => server.close(resolve))
    },
    async connect ({ cookie, user, connected = true, originHeader } = {}) {
      const { address: hostname, port } = server.address()
      const origin = `http://[${hostname}]:${port}`
      const extraHeaders = { origin: originHeader ?? origin }
      if (cookie) {
        extraHeaders.cookie = cookie
      } else if (user) {
        extraHeaders.cookie = await user.cookie
      }
      const socket = ioClient(origin, {
        path: '/api/events',
        extraHeaders,
        reconnection: false,
        forceNew: true,
        autoConnect: false,
        transports: ['websocket'],
      })
      socket.connect()
      if (connected) {
        await pEvent(socket, 'connect', {
          timeout: 1000,
          rejectionEvents: ['error', 'connect_error'],
        })
      }
      return socket
    },
  }

  return agent
}

export async function createAgent (type = 'http', cache) {
  switch (type) {
    case 'io':
      return createSocketAgent(cache)
    default:
      return createHttpAgent()
  }
}
