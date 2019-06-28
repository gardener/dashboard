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

const { assign, merge } = require('lodash')
const { existsSync } = require('fs')
const net = require('net')

const BaseObject = require('kubernetes-client/lib/base')
BaseObject.prototype.watch = require('./watch')
BaseObject.prototype.mergePatch = mergePatch
BaseObject.prototype.jsonPatch = jsonPatch
const ApiGroup = require('kubernetes-client/lib/api-group')
const kubernetesClient = require('kubernetes-client')
const yaml = require('js-yaml')
const Resources = require('./Resources')
const Specs = require('./Specs')
const {
  GatewayTimeout,
  InternalServerError
} = require('../errors')
const logger = require('../logger')

const {
  Api,
  ApiExtensions,
  Core,
  Extensions,
  CustomResourceDefinitions,
  Apps,
  Batch,
  Rbac,
  config: {
    getInCluster,
    loadKubeconfig,
    fromKubeconfig
  }
} = kubernetesClient

const promises = true

function config () {
  if (/^test/.test(process.env.NODE_ENV)) {
    return {
      url: 'https://kubernetes:6443',
      auth: {
        bearer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
      },
      namespace: 'garden'
    }
  }
  try {
    return getInCluster()
  } catch (err) {
    const cfgPath = process.env.KUBECONFIG
    if (cfgPath && existsSync(cfgPath)) {
      return fromKubeconfig(loadKubeconfig(cfgPath))
    }
    return fromKubeconfig()
  }
}

function credentials (options = {}) {
  if (options.auth) {
    options.key = options.cert = undefined
  }
  if (options.key && options.cert) {
    options.auth = undefined
  }
  options = assign({ promises }, config(), options)
  const url = new URL(options.url)
  if (net.isIP(url.hostname) !== 0) {
    //  Use empty string '' to disable sending the SNI extension (https://nodejs.org/api/https.html#https_new_agent_options)
    options.request = {
      servername: ''
    }
  }
  return options
}

function mergePatch (options, ...rest) {
  const headers = { 'content-type': 'application/merge-patch+json' }
  return this.patch(merge({ headers }, options), ...rest)
}

function jsonPatch (options, ...rest) {
  const headers = { 'content-type': 'application/json-patch+json' }
  return this.patch(merge({ headers }, options), ...rest)
}

function _waitUntilResourceHasCondition ({ watch, conditionFunction, waitTimeout = 5000, resourceName, onTimeoutError }) {
  return new Promise((resolve, reject) => { // TODO on error, reject promise?
    const timeoutId = setTimeout(() => {
      const error = onTimeoutError()
      done(error)
    }, waitTimeout)

    function done (err, obj) {
      clearTimeout(timeoutId)

      watch.removeListener('event', onEvent)
      watch.removeListener('error', onError)
      watch.removeListener('disconnect', onDisconnect)

      watch.reconnect = false
      watch.disconnect()
      if (err) {
        return reject(err)
      }
      resolve(obj)
    }

    function onEvent (event) {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          if (conditionFunction(event.object)) {
            done(null, event.object)
          }
          break
        case 'DELETED':
          done(new InternalServerError(`Resource "${resourceName}" has been deleted`))
          break
      }
    }

    function onError (err) {
      logger.error(`Error watching Resource "%s": %s`, resourceName, err.message)
    }

    function onDisconnect (err) {
      done(err || new InternalServerError(`Watch for Resource "${resourceName}" has been disconnected`))
    }

    watch.on('event', onEvent)
    watch.on('error', onError)
    watch.on('disconnect', onDisconnect)
  })
}

module.exports = {
  config,
  credentials,
  kubernetesClient,
  Resources,
  fromKubeconfig (kubeconfig) {
    return fromKubeconfig(yaml.safeLoad(kubeconfig))
  },
  core (options) {
    return new Core(credentials(options))
  },
  api (options) {
    return new Api(credentials(options))
  },
  apiExtensions (options) {
    return new ApiExtensions(credentials(options))
  },
  apps (options) {
    return new Apps(credentials(options))
  },
  extensions (options) {
    options = assign(options, {
      version: 'v1beta1'
    })
    return new Extensions(credentials(options))
  },
  rbac (options) {
    options = assign(options, {
      version: 'v1'
    })
    return new Rbac(credentials(options))
  },
  crds (options) {
    return new CustomResourceDefinitions(credentials(options))
  },
  batch (options) {
    options = assign(options, {
      version: 'v1beta1'
    })
    return new Batch(credentials(options))
  },
  garden (options) {
    const resources = [
      Resources.Shoot.name,
      Resources.Seed.name,
      Resources.CloudProfile.name,
      Resources.SecretBinding.name,
      Resources.Quota.name,
      Resources.Project.name
    ]
    options = assign(options, {
      path: 'apis/garden.sapcloud.io',
      version: 'v1beta1',
      namespaceResources: resources,
      groupResources: resources
    })
    return new ApiGroup(credentials(options))
  },
  apiRegistration (options) {
    options = assign(options, {
      path: 'apis/apiregistration.k8s.io',
      version: 'v1',
      namespaceResources: [],
      groupResources: [
        'apiservices'
      ]
    })
    return new ApiGroup(credentials(options))
  },
  authentication (options) {
    options = assign(options, {
      path: 'apis/authentication.k8s.io',
      version: 'v1',
      namespaceResources: [],
      groupResources: [
        'tokenreviews'
      ]
    })
    return new ApiGroup(credentials(options))
  },
  authorization (options) {
    options = assign(options, {
      path: 'apis/authorization.k8s.io',
      version: 'v1',
      namespaceResources: [
        'localsubjectaccessreviews'
      ],
      groupResources: [
        'selfsubjectaccessreviews',
        'selfsubjectrulesreviews',
        'subjectaccessreviews'
      ]
    })
    return new ApiGroup(credentials(options))
  },
  healthz () {
    return new kubernetesClient.Client({
      config: credentials(),
      spec: Specs.Healthz
    })
  },
  getKubeconfigFromServiceAccount ({ serviceAccountName, contextName = 'default', contextNamespace, token, server, caData }) {
    const clusterName = 'garden' // TODO as parameter
    const cluster = {
      'certificate-authority-data': caData,
      server
    }
    const username = serviceAccountName
    const user = {
      token
    }
    const context = {
      cluster: clusterName,
      user: username,
      namespace: contextNamespace
    }
    return yaml.safeDump({
      kind: 'Config',
      clusters: [{
        cluster,
        name: clusterName
      }],
      users: [{
        user,
        name: username
      }],
      contexts: [{
        context,
        name: contextName
      }],
      'current-context': contextName
    })
  },
  async waitUntilResourceHasCondition ({ watch, conditionFunction, waitTimeout = 5000, resourceName }) {
    const onTimeoutError = () => {
      const duration = `${waitTimeout} ms`
      return new GatewayTimeout(`Resource "${resourceName}" could not be initialized within ${duration}`)
    }
    return _waitUntilResourceHasCondition({ watch, conditionFunction, waitTimeout, resourceName, onTimeoutError })
  }
}
