//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const { createTerminus } = require('@godaddy/terminus')

class TestAgent {
  constructor (app) {
    this.server = http.createServer(app)
    const healthCheck = app.get('healthCheck')
    if (typeof healthCheck === 'function') {
      const signal = 'SIGTERM'
      const healthChecks = {
        '/healthz': () => healthCheck(false),
        '/healthz-transitive': () => healthCheck(true)
      }
      process.removeAllListeners(signal)
      this.server = createTerminus(this.server, { signal, healthChecks })
    }
  }

  get (url) {
    return chai.request(this.server)
      .get(url)
      .set('x-requested-with', 'XMLHttpRequest')
  }

  put (url) {
    return chai.request(this.server)
      .put(url)
      .set('x-requested-with', 'XMLHttpRequest')
  }

  patch (url) {
    return chai.request(this.server)
      .patch(url)
      .set('x-requested-with', 'XMLHttpRequest')
  }

  delete (url) {
    return chai.request(this.server)
      .delete(url)
      .set('x-requested-with', 'XMLHttpRequest')
  }

  post (url) {
    return chai.request(this.server)
      .post(url)
      .set('x-requested-with', 'XMLHttpRequest')
  }

  close () {
    this.server.close()
  }
}

module.exports = TestAgent
