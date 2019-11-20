
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

const {
  getConfigValue,
  getSeedNameFromShoot
} = require('../../utils')

const { isHttpError } = require('../../kubernetes-client')
const assert = require('assert').strict
const { getSeed } = require('../../cache')

const GardenTerminalHostRefType = {
  SECRET_REF: 'secretRef',
  SEED_REF: 'seedRef',
  SHOOT_REF: 'shootRef'
}

function getShoot (client, { namespace, name }) {
  return client['core.gardener.cloud'].shoots.get({ namespace, name })
}

async function shootExists (client, { namespace, name }) {
  try {
    await getShoot(client, { namespace, name })
  } catch (err) {
    if (isHttpError(err, 404)) {
      return false
    }
    throw err
  }
  return true
}

function getShootIngressDomain (client, shoot) {
  const seed = getSeed(getSeedNameFromShoot(shoot))
  return client.getShootIngressDomain(shoot, seed)
}

function getSeedIngressDomain (client, seed) {
  return client.getSeedIngressDomain(seed)
}

/*
  Returns the secretRef for the cluster, that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterSecretRef (client) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { items: runtimeSecrets } = await getGardenTerminalHostClusterSecrets(client)
      const secret = _.head(runtimeSecrets)
      return {
        namespace: secret.metadata.namespace,
        name: secret.metadata.name
      }
    }
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      return _.get(seed, 'spec.secretRef')
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      return {
        namespace: getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden'),
        name: `${shootName}.kubeconfig`
      }
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

function getSeedForGardenTerminalHostCluster () {
  const seedName = getConfigValue('terminal.gardenTerminalHost.seedRef')
  const seed = getSeed(seedName)
  if (!seed) {
    throw new Error(`There is no seed with name ${seedName}`)
  }
  return seed
}

async function getGardenHostClusterKubeApiServer (client) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      return getConfigValue('terminal.gardenTerminalHost.apiServerIngressHost')
    }
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      return getKubeApiServerHostForSeed(client, seed)
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const namespace = getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden')
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const shootResource = await getShoot(client, { namespace, name: shootName })
      return getKubeApiServerHostForShoot(client, shootResource)
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

async function getKubeApiServerHostForSeed (client, seed) {
  const name = seed.metadata.name
  const namespace = 'garden'

  let ingressDomain
  const isShootedSeed = await shootExists(client, { namespace, name })
  if (isShootedSeed) {
    const shootResource = await getShoot(client, { namespace, name })
    ingressDomain = await getShootIngressDomain(client, shootResource)
  } else {
    ingressDomain = await getSeedIngressDomain(client, seed)
  }

  return `k-${ingressDomain}`
}

async function getKubeApiServerHostForShoot (client, shootResource) {
  const ingressDomain = await getShootIngressDomain(client, shootResource)
  return `k-${ingressDomain}`
}

function getGardenTerminalHostClusterRefType () {
  return _
    .chain(getConfigValue('terminal.gardenTerminalHost'))
    .keys()
    .intersection(['secretRef', 'seedRef', 'shootRef'])
    .head()
    .value()
}

function getGardenTerminalHostClusterSecrets (client) {
  const namespace = getConfigValue('terminal.gardenTerminalHost.secretRef.namespace', 'garden')
  assert.ok(namespace, 'namespace must be set')
  const labelSelector = getConfigValue('terminal.gardenTerminalHost.secretRef.labelSelector', ['runtime=gardenTerminalHost'])
  const query = {
    labelSelector: labelSelector.join(',')
  }
  return client.core.secrets.get({ namespace, query })
}

module.exports = {
  getShoot,
  shootExists,
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  getGardenHostClusterKubeApiServer,
  getKubeApiServerHostForSeed,
  getKubeApiServerHostForShoot,
  GardenTerminalHostRefType
}
