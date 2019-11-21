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

const debug = require('./debug')
const util = require('./util')
const Client = require('./Client')
const kubeconfig = require('../kubeconfig')
const {
  setAuthorization,
  isHttpError
} = util
const config = kubeconfig.load(process.env)

function createClient (options) {
  options = kubeconfig.mergeOptions(config, options)
  if (options.auth) {
    const auth = options.auth
    delete options.auth
    if (auth.bearer) {
      setAuthorization(options, 'bearer', auth.bearer)
    } else if (auth.user && auth.pass) {
      setAuthorization(options, 'basic', `${auth.user}:${auth.pass}`)
    } else if (typeof auth === 'string') {
      setAuthorization(options, 'basic', auth)
    }
  }
  options = debug.attach(options)
  return Client.create(options)
}

exports = module.exports = createClient

const privilegedClient = createClient({ privileged: true })
const Resources = privilegedClient.getResources()

Object.assign(exports, {
  createClient,
  privilegedClient,
  Resources,
  isHttpError
})
