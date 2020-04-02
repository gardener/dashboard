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

const assert = require('assert').strict
const util = require('./util')
const Client = require('./Client')
const WatchBuilder = require('./WatchBuilder')
const Store = require('./cache/Store')
const { Resources } = require('./resources')
const kubeconfig = require('../kubernetes-config')
const { isHttpError } = util
const config = kubeconfig.load(process.env)

function createClient ({ auth, key, cert, ...options } = {}) {
  assert.ok(auth || (key && cert), 'Client credentials are required')
  if (key && cert) {
    options.key = key
    options.cert = cert
  } else if (auth) {
    options.auth = auth
  }
  // if no url is given use server from kubeconfig
  if (!options.url) {
    options.url = config.url
    options.ca = config.ca
    options.rejectUnauthorized = config.rejectUnauthorized
  }
  return new Client(options)
}

exports = module.exports = createClient

// create a client instance for the gardener cluster with dashboard privileges
const dashboardClient = new Client(config)

Object.assign(exports, {
  createClient,
  dashboardClient,
  Resources,
  Store,
  WatchBuilder,
  isHttpError
})
