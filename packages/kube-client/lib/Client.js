//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import request from '@gardener-dashboard/request'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import httpErrors from 'http-errors'
import { decodeBase64 } from './util.js'
import debug from './debug.js'
import * as resources from './resources/index.js'
import * as nonResourceEndpoints from './nonResourceEndpoints/index.js'
import kubeConfig from '@gardener-dashboard/kube-config'

const { isHttpError } = request
const { NotFound } = httpErrors
const { fromKubeconfig, parseKubeconfig } = kubeConfig

class Client {
  #clientConfig

  constructor (clientConfig, workspace, options) {
    this.#clientConfig = clientConfig
    // add hooks for logging
    options = debug.attach(options)
    // assign grouped resources (e.g. core.)
    resources.assign(this, clientConfig, workspace, options)
    // assign non-resource endpoints (e.g healthz)
    nonResourceEndpoints.assign(this, clientConfig, options)
  }

  get cluster () {
    const server = this.#clientConfig.url
    const certificateAuthority = this.#clientConfig.ca
    const insecureSkipTlsVerify = !this.#clientConfig.rejectUnauthorized
    return {
      server: new URL(server),
      certificateAuthority,
      insecureSkipTlsVerify,
    }
  }

  async getKubeconfig ({ name, namespace }) {
    const secret = await this.getSecret({ name, namespace })
    const kubeconfigBase64 = _.get(secret, ['data', 'kubeconfig'])
    if (!kubeconfigBase64) {
      throw NotFound('No "kubeconfig" found in secret')
    }
    const kubeconfig = parseKubeconfig(decodeBase64(kubeconfigBase64))
    const authProviderName = _.get(kubeconfig, ['currentUser', 'auth-provider', 'name'])
    const serviceaccountJsonBase64 = _.get(secret, ['data', 'serviceaccount.json'])
    if (authProviderName === 'gcp' && !serviceaccountJsonBase64) {
      throw NotFound('No "serviceaccount.json" found in secret for gcp authentication provider')
    }
    if (serviceaccountJsonBase64) {
      try {
        const credentials = JSON.parse(decodeBase64(serviceaccountJsonBase64))
        await kubeconfig.refreshAuthProviderConfig(credentials)
      } catch (err) {
        logger.warn(`Failed to refresh auth-provider config of kubeconfig secret "${name}" in namespace "${namespace}"`)
      }
    }
    return kubeconfig
  }

  async createShootAdminKubeconfig ({ name, namespace }) {
    const { apiVersion, kind } = resources.Resources.AdminKubeconfigRequest
    const body = {
      kind,
      apiVersion,
      spec: {
        expirationSeconds: 600, // 10 minutes (lowest possible value https://github.com/gardener/gardener/blob/master/pkg/apis/authentication/validation/validation.go#L34)
      },
    }

    const adminKubeconfigRequest = await this['core.gardener.cloud'].shoots.createAdminKubeconfigRequest(namespace, name, body)
    const kubeconfigBase64 = _.get(adminKubeconfigRequest, ['status', 'kubeconfig'])
    return parseKubeconfig(decodeBase64(kubeconfigBase64))
  }

  async createKubeconfigClient (secretRef) {
    const kubeconfig = await this.getKubeconfig(secretRef)
    return new this.constructor(fromKubeconfig(kubeconfig))
  }

  async createShootAdminKubeconfigClient (shootRef) {
    const kubeconfig = await this.createShootAdminKubeconfig(shootRef)
    return new this.constructor(fromKubeconfig(kubeconfig))
  }

  getShoot (...args) {
    return getResource(this['core.gardener.cloud'].shoots, ...args)
  }

  getSecret (...args) {
    return getResource(this.core.secrets, ...args)
  }

  getManagedSeed (...args) {
    return getResource(this['seedmanagement.gardener.cloud'].managedseeds, ...args)
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

export default Client
