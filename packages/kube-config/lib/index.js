//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const Config = require('./Config')
const ClientConfig = require('./ClientConfig')
const {
  KUBERNETES_SERVICEACCOUNT_TOKEN_FILE,
  KUBERNETES_SERVICEACCOUNT_CA_FILE
} = require('./constants')

function readKubeconfig (filename) {
  if (!filename) {
    filename = path.join(os.homedir(), '.kube', 'config')
  }
  if (filename.indexOf(':') !== -1) {
    filename = filename.split(':')
  }
  // use the first kubeconfig file
  if (Array.isArray(filename)) {
    filename = filename.shift()
  }
  const dirname = path.dirname(filename)
  const kubeconfig = yaml.load(fs.readFileSync(filename))
  const resolvePath = (object, key) => {
    if (object[key]) {
      object[key] = path.resolve(dirname, object[key])
    }
  }
  for (const { cluster } of kubeconfig.clusters) {
    resolvePath(cluster, 'certificate-authority')
  }
  for (const { user } of kubeconfig.users) {
    resolvePath(user, 'client-key')
    resolvePath(user, 'client-certificate')
    resolvePath(user, 'tokenFile')
  }
  return new Config(kubeconfig)
}

function inClusterConfig ({
  KUBERNETES_SERVICE_HOST: host,
  KUBERNETES_SERVICE_PORT: port
}) {
  if (!host || !port) {
    throw new TypeError('Failed to load in-cluster configuration, kubernetes service endpoint not defined')
  }

  return Config.build({
    server: `https://${host}:${port}`,
    'certificate-authority': KUBERNETES_SERVICEACCOUNT_CA_FILE
  }, {
    tokenFile: KUBERNETES_SERVICEACCOUNT_TOKEN_FILE
  })
}

exports = module.exports = {
  Config,
  ClientConfig,
  constants: {
    KUBERNETES_SERVICEACCOUNT_CA_FILE,
    KUBERNETES_SERVICEACCOUNT_TOKEN_FILE
  },
  parseKubeconfig (input) {
    return Config.parse(input)
  },
  cleanKubeconfig (input) {
    return exports.parseKubeconfig(input).clean()
  },
  fromKubeconfig (input) {
    return new ClientConfig(exports.cleanKubeconfig(input))
  },
  dumpKubeconfig ({ userName, contextName = 'default', clusterName = 'garden', namespace, token, server, caData }) {
    return Config.build(
      { server, 'certificate-authority-data': caData },
      { token },
      { userName, contextName, clusterName, namespace }
    ).toYAML()
  },
  load (env, options) {
    let config
    if (env.KUBECONFIG) {
      config = readKubeconfig(env.KUBECONFIG)
    } else {
      try {
        config = inClusterConfig(env)
      } catch (err) {
        config = readKubeconfig()
      }
    }
    return new ClientConfig(config, { ...options, reactive: true })
  },
  getInCluster (env) {
    try {
      return new ClientConfig(inClusterConfig(env))
    } catch (err) {
      if (err.code === 'ENOENT') {
        switch (err.path) {
          case KUBERNETES_SERVICEACCOUNT_TOKEN_FILE:
            throw new TypeError('Failed to load in-cluster configuration, serviceaccount token not found')
          case KUBERNETES_SERVICEACCOUNT_CA_FILE:
            throw new TypeError('Failed to load in-cluster configuration, serviceaccount certificate authority not found')
        }
      }
      throw err
    }
  }
}
