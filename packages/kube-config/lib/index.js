//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import fs from 'fs'
import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import Config from './Config.js'
import ClientConfig from './ClientConfig.js'
import {
  KUBERNETES_SERVICEACCOUNT_TOKEN_FILE,
  KUBERNETES_SERVICEACCOUNT_CA_FILE,
} from './constants.js'

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
  const kubeconfig = yaml.load(
    fs.readFileSync(filename, 'utf8'), // eslint-disable-line security/detect-non-literal-fs-filename
  )
  const resolvePath = (object, key) => {
    const value = object[key] // eslint-disable-line security/detect-object-injection
    if (value) {
      object[key] = path.resolve(dirname, value) // eslint-disable-line security/detect-object-injection
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
  KUBERNETES_SERVICE_PORT: port,
}) {
  if (!host || !port) {
    throw new TypeError('Failed to load in-cluster configuration, kubernetes service endpoint not defined')
  }

  return Config.build({
    server: `https://${host}:${port}`,
    'certificate-authority': KUBERNETES_SERVICEACCOUNT_CA_FILE,
  }, {
    tokenFile: KUBERNETES_SERVICEACCOUNT_TOKEN_FILE,
  })
}

function parseKubeconfig (input) {
  return Config.parse(input)
}
function cleanKubeconfig (input) {
  return parseKubeconfig(input).clean()
}
function fromKubeconfig (input) {
  return new ClientConfig(cleanKubeconfig(input))
}
function dumpKubeconfig ({ userName, contextName = 'default', clusterName = 'garden', namespace, token, server, caData }) {
  return Config.build(
    { server, 'certificate-authority-data': caData },
    { token },
    { userName, contextName, clusterName, namespace },
  ).toYAML()
}
function load (env, options) {
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
}
function getInCluster (env) {
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

export default {
  Config,
  ClientConfig,
  constants: {
    KUBERNETES_SERVICEACCOUNT_CA_FILE,
    KUBERNETES_SERVICEACCOUNT_TOKEN_FILE,
  },
  parseKubeconfig,
  cleanKubeconfig,
  fromKubeconfig,
  dumpKubeconfig,
  load,
  getInCluster,
}
