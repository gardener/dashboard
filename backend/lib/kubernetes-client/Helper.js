
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
const { getSeed } = require('../cache')
const { decodeBase64 } = require('../utils')
const { NotFound } = require('../errors')

class Helper {
  async getShootIngressDomain (shoot, seed = undefined) {
    if (!seed) {
      seed = getSeed(this.getSeedNameFromShoot(shoot))
    }
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

  async getSeedKubeconfig (seed) {
    const secretRef = _.get(seed, 'spec.secretRef')
    return this.getKubeconfig(secretRef)
  }

  async getKubeconfig ({ name, namespace }) {
    try {
      const secret = await this.get('core').secrets.get({ namespace, name })

      const kubeConfigBase64 = _.get(secret, 'data.kubeconfig')
      if (!kubeConfigBase64) {
        return
      }

      return decodeBase64(secret.data.kubeconfig)
    } catch (err) {
      if (err.name === 'HTTPError' && err.response.statusCode === 404) {
        return
      }
      throw err
    }
  }

  async getProjectNameFromNamespace (namespace) {
    try {
      const project = await this.getProjectByNamespace(namespace)
      return project.metadata.name
    } catch (err) {
      if (err.name === 'HTTPError' && err.response.statusCode === 404) {
        if (namespace === 'garden') {
        /*
          fallback: if there is no corresponding garden project, use namespace name.
          The community installer currently does not create a project resource for the garden namespace
          because of https://github.com/gardener/gardener/issues/879
        */
          return namespace
        }
      }
      throw err
    }
  }

  async getProjectByNamespace (namespace) {
    const ns = await this.get('core').namespaces.get({ name: namespace })
    const name = _.get(ns, ['metadata', 'labels', 'project.garden.sapcloud.io/name'])
    if (!name) {
      throw new NotFound(`Namespace '${namespace}' is not related to a gardener project`)
    }
    return this.get('core.gardener.cloud').projects.get({ name })
  }
}

module.exports = Helper
