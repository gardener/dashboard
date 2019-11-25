
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

const fnv = require('fnv-plus')
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

async function getShoot (client, { namespace, name, throwNotFound = true }) {
  let shoot
  try {
    shoot = await client['core.gardener.cloud'].shoots.get({ namespace, name })
  } catch (err) {
    if (throwNotFound || !isHttpError(err, 404)) {
      throw err
    }
  }
  return shoot
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
      return getKubeApiServerHostForSeedOrShootedSeed(client, seed)
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const namespace = getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden')
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const shootResource = await getShoot(client, { namespace, name: shootName })
      return getKubeApiServerHostForShoot(shootResource)
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

// TODO remove coreClient param.
async function getKubeApiServerHostForSeedOrShootedSeed (client, seed) {
  const name = seed.metadata.name
  const namespace = 'garden'

  const shoot = await getShoot(client, { namespace, name, throwNotFound: false })
  if (shoot) {
    return getKubeApiServerHostForShoot(shoot)
  } else {
    return getKubeApiServerHostForSeed(seed)
  }
}

function getKubeApiServerHostForShoot (shoot, seed) {
  if (!seed) {
    seed = getSeed(getSeedNameFromShoot(shoot))
  }
  const { namespace, name } = shoot.metadata
  const hash = fnv.hash(`${name}.${namespace}`, 32).str()
  const ingressDomain = seed.spec.dns.ingressDomain
  return `k-${hash}.${ingressDomain}`
}

function getKubeApiServerHostForSeed (seed) {
  const ingressDomain = seed.spec.dns.ingressDomain
  return `k-g.${ingressDomain}`
}

function getWildcardIngressDomainForSeed (seed) {
  const ingressDomain = seed.spec.dns.ingressDomain
  return `*.${ingressDomain}`
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
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  getGardenHostClusterKubeApiServer,
  getKubeApiServerHostForSeed,
  getKubeApiServerHostForShoot,
  getWildcardIngressDomainForSeed,
  getKubeApiServerHostForSeedOrShootedSeed,
  GardenTerminalHostRefType
}
