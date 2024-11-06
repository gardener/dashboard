//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const _ = require('lodash')

const {
  getConfigValue,
  getSeedNameFromShoot,
  getSeedIngressDomain,
} = require('../../utils')

const { getSeed, findProjectByNamespace } = require('../../cache')

const GardenTerminalHostRefType = {
  SECRET_REF: 'secretRef',
  SEED_REF: 'seedRef',
  SHOOT_REF: 'shootRef',
}

/*
  Returns the credential for the cluster (shootRef or secretRef), that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterCredentials (client) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { items: runtimeSecrets } = await getGardenTerminalHostClusterSecrets(client)
      const secret = _.head(runtimeSecrets)
      const secretRef = {
        namespace: secret.metadata.namespace,
        name: secret.metadata.name,
      }
      return {
        secretRef,
      }
    }
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seed.metadata.name, throwNotFound: false })

      if (managedSeed) {
        return {
          shootRef: getShootRef(managedSeed),
        }
      }

      return {
        secretRef: _.get(seed, ['spec', 'secretRef']),
      }
    }
    case GardenTerminalHostRefType.SHOOT_REF: { // TODO refactor to return shootRef instead. The static kubeconfig might be disabled
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const secretRef = {
        namespace: getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden'),
        name: `${shootName}.kubeconfig`,
      }
      return {
        secretRef,
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
      const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seed.metadata.name, throwNotFound: false })
      return getKubeApiServerHostForSeedOrManagedSeed(client, seed, managedSeed)
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const namespace = getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden')
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const shootResource = await client.getShoot({ namespace, name: shootName })
      return getKubeApiServerHostForShoot(shootResource)
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

async function getKubeApiServerHostForSeedOrManagedSeed (client, seed, managedSeed) {
  if (managedSeed) {
    const shootRef = getShootRef(managedSeed)
    const shoot = await client.getShoot(shootRef)
    return getKubeApiServerHostForShoot(shoot)
  }

  return getKubeApiServerHostForSeed(seed)
}

function getKubeApiServerHostForShoot (shoot, seed) {
  if (!seed) {
    seed = getSeed(getSeedNameFromShoot(shoot))
  }
  const { namespace, name } = shoot.metadata
  const projectName = findProjectByNamespace(namespace).metadata.name
  const ingressDomain = getSeedIngressDomain(seed)
  return `api-${projectName}--${name}.${ingressDomain}`
}

function getKubeApiServerHostForSeed (seed) {
  const ingressDomain = getSeedIngressDomain(seed)
  return `api-seed.${ingressDomain}`
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
    labelSelector: labelSelector.join(','),
  }
  return client.core.secrets.list(namespace, query)
}

function getShootRef (managedSeed) {
  return {
    namespace: managedSeed.metadata.namespace,
    name: managedSeed.spec.shoot.name,
  }
}

module.exports = {
  getKubeApiServerHostForSeedOrManagedSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterCredentials,
  getGardenHostClusterKubeApiServer,
  getShootRef,
}
