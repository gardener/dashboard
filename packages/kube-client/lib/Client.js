//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { isIP } = require('net')
const { isHttpError } = require('@gardener-dashboard/request')
const { NotFound } = require('http-errors')
const { decodeBase64, setAuthorization } = require('./util')
const debug = require('./debug')
const resources = require('./resources')
const nonResourceEndpoints = require('./nonResourceEndpoints')

const { fromKubeconfig } = require('@gardener-dashboard/kube-config')

const cluster = Symbol('cluster')

class Client {
  // the options are use to create a got instance (see https://github.com/sindresorhus/got#api)
  constructor ({ auth, ...options } = {}) {
    const { hostname } = new URL(options.url)
    // use empty string '' to disable sending the SNI extension
    const servername = isIP(hostname) !== 0 ? '' : hostname
    // merge with default options
    options = {
      servername,
      ...options
    }
    // set authorization header for basic and bearer authentication scheme
    if (auth) {
      if (auth.bearer) {
        setAuthorization(options, 'bearer', auth.bearer)
      } else if (auth.user && auth.pass) {
        setAuthorization(options, 'basic', `${auth.user}:${auth.pass}`)
      } else if (typeof auth === 'string') {
        setAuthorization(options, 'basic', auth)
      }
    }
    // add hooks for logging
    options = debug.attach(options)
    // kubernetes cluster endpoint info
    const { url, ca, rejectUnauthorized = true } = options
    this[cluster] = {
      server: url,
      certificateAuthority: ca,
      insecureSkipTlsVerify: !rejectUnauthorized
    }
    // assign grouped resources (e.g. core.)
    resources.assign(this, options)
    // assign non-resource endpoints (e.g healthz)
    nonResourceEndpoints.assign(this, options)
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
    const secret = await this.getSecret({ name, namespace })
    const kubeconfigBase64 = _.get(secret, 'data.kubeconfig')
    if (!kubeconfigBase64) {
      throw NotFound('No kubeconfig found in secret')
    }
    return decodeBase64(kubeconfigBase64)
  }

  async createKubeconfigClient (secretRef) {
    const kubeconfig = await this.getKubeconfig(secretRef)
    return new this.constructor(fromKubeconfig(kubeconfig))
  }

  getShoot (...args) {
    return getResource(this['core.gardener.cloud'].shoots, ...args)
  }

  getSecret (...args) {
    return getResource(this.core.secrets, ...args)
  }
}

async function getResource (resource, { namespace, name, throwNotFound = true }) {
  try {
    return await resource.get(namespace, name)
  } catch (err) {
    if (throwNotFound || !isHttpError(err, 404)) {
      throw err
    }
  }
}

module.exports = Client
