//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
        '/healthz': healthCheck
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
