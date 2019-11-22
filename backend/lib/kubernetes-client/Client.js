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
const { ApiGroup, Endpoint } = require('./resources')
const debug = require('./debug')

const { fromKubeconfig } = require('../kubeconfig')
const { decodeBase64 } = require('../utils')

const cluster = Symbol('cluster')
class Client {
  constructor (options = {}) {
    const { url, ca, rejectUnauthorized = true } = options
    this[cluster] = {
      server: new URL(url),
      'certificate-authority-data': ca,
      'insecure-skip-tls-verify': !rejectUnauthorized
    }
    ApiGroup.assignAll(this, options)
    Endpoint.assignAll(this, options)
  }

  get cluster () {
    return this[cluster]
  }

  getResources () {
    return this.constructor.getResources()
  }

  async getShootIngressDomain (shoot, seed) {
    const name = _.get(shoot, 'metadata.name')
    const namespace = _.get(shoot, 'metadata.namespace')

    const ingressDomain = _.get(seed, 'spec.dns.ingressDomain')
    const projectName = await this.getProjectNameFromNamespace(namespace)

    return `${name}.${projectName}.${ingressDomain}`
  }

  async getSeedIngressDomain (seed) {
    const namespace = 'garden'

    const ingressDomain = _.get(seed, 'spec.dns.ingressDomain')
    const projectName = await this.getProjectNameFromNamespace(namespace)

    return `${projectName}.${ingressDomain}`
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

  async getProjectNameFromNamespace (namespace) {
    try {
      const project = await this.getProjectByNamespace(namespace)
      return project.metadata.name
    } catch (err) {
      if (isHttpError(err, 404) && namespace === 'garden') {
        /*
          fallback: if there is no corresponding garden project, use namespace name.
          The community installer currently does not create a project resource for the garden namespace
          because of https://github.com/gardener/gardener/issues/879
        */
        return namespace
      }
      throw err
    }
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
