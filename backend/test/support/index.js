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

process.env.NODE_ENV = 'test'

delete process.env.HTTP_PROXY
delete process.env.http_proxy
delete process.env.HTTPS_PROXY
delete process.env.https_proxy

/*!
 * Common modules
 */

global.sinon = require('sinon')
global.nocks = require('./nocks')()
function verifyAndRestore (sandbox) {
  try {
    global.nocks.verifyAndCleanAll()
  } finally {
    if (sandbox) {
      sandbox.restore()
    }
  }
}
global.verifyAndRestore = verifyAndRestore

/*!
 * Attach chai to global
 */
global.chai = require('chai')
global.expect = global.chai.expect

/*!
 * Chai Plugins
 */
global.chai.use(require('sinon-chai'))
global.chai.use(require('chai-http'))

/*!
 * HTTP server object for testing to allow closing
 */
const http = require('http')
const app = require('../../lib/app')
const { createTerminus } = require('@godaddy/terminus')
const healthChecks = {
  '/healthz': app.get('healthCheck')
}
const signal = 'SIGTERM'
global.createServer = () => {
  process.removeAllListeners(signal)
  return createTerminus(http.createServer(app), { signal, healthChecks })
}
global.request = async (app, method, url, user) => {
  return global.chai.request(app)[method](url)
    .set('x-requested-with', 'XMLHttpRequest')
    .set('cookie', await user.cookie)
}
