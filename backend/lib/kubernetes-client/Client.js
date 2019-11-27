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

const _ = require('lodash')
const assert = require('assert').strict
const { isIP } = require('net')
const { HTTPError } = require('got')
const { isHttpError, setAuthorization } = require('./util')
const { ApiGroup, NonResourceEndpoint } = require('./resources')
const debug = require('./debug')

const { fromKubeconfig } = require('../kubernetes-config')
const { decodeBase64 } = require('../utils')

const cluster = Symbol('cluster')
class Client {
  constructor (options = {}) {
    const { url, ca, rejectUnauthorized = true } = options
    this[cluster] = {
      server: url,
      certificateAuthority: ca,
      insecureSkipTlsVerify: !rejectUnauthorized
    }
    ApiGroup.assignAll(this, options)
    NonResourceEndpoint.assignAll(this, options)
  }

  get cluster () {
    const { server, certificateAuthority, insecureSkipTlsVerify } = this[cluster]
    return {
      server: new URL(server),
      certificateAuthority,
      insecureSkipTlsVerify
    }
  }

  async getKubeconfig ({ name, namespace }) {
    try {
      const secret = await this.core.secrets.get({ namespace, name })

      const kubeconfigBase64 = _.get(secret, 'data.kubeconfig')
      if (kubeconfigBase64) {
        return decodeBase64(kubeconfigBase64)
      }
    } catch (err) {
      if (!isHttpError(err, 404)) {
        throw err
      }
    }
  }

  async createKubeconfigClient (secretRef) {
    const kubeconfig = await this.getKubeconfig(secretRef)
    assert.ok(kubeconfig, 'kubeconfig does not exist (yet)')
    return this.constructor.create(fromKubeconfig(kubeconfig))
  }

  async getProjectByNamespace (namespace) {
    const ns = await this.core.namespaces.get({ name: namespace })
    const name = _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
    if (!name) {
      const response = {
        statusCode: 404,
        statusMessage: `Namespace '${namespace}' is not related to a gardener project`
      }
      throw new HTTPError(response)
    }
    return this['core.gardener.cloud'].projects.get({ name })
  }

  async getShoot ({ namespace, name, throwNotFound = true }) {
    let shoot
    try {
      shoot = await this['core.gardener.cloud'].shoots.get({ namespace, name })
    } catch (err) {
      if (throwNotFound || !isHttpError(err, 404)) {
        throw err
      }
    }
    return shoot
  }

  getResources () {
    return this.constructor.getResources()
  }

  static getResources () {
    return ApiGroup.getResources()
  }

  static create (options = {}) {
    const { hostname } = new URL(options.url)
    options = {
      servername: isIP(hostname) !== 0 ? '' : hostname,
      throwHttpErrors: true,
      resolveBodyOnly: true,
      timeout: 30 * 1000,
      ...options
    }
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
    return new Client(options)
  }
}

module.exports = Client
