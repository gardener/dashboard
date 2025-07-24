//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'assert/strict'
import _ from 'lodash-es'
import { format as fmt } from 'util'
import {
  getConfigValue,
  getSeedNameFromShoot,
  getSeedIngressDomain,
} from '../../utils/index.js'
import cache from '../../cache/index.js'

const { getSeed, findProjectByNamespace } = cache

const GardenTerminalHostRefType = {
  SEED_REF: 'seedRef',
  SHOOT_REF: 'shootRef',
}

/*
  Returns the shootRef credential for the cluster, that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterCredentials (client) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      const managedSeed = await client.getManagedSeed({ namespace: 'garden', name: seed.metadata.name, throwNotFound: false })

      if (!managedSeed) {
        throw new Error(fmt('Seed %s is not a managed seed', seed.metadata.name))
      }
      return {
        shootRef: getShootRef(managedSeed),
      }
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const shootRef = {
        namespace: getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden'),
        name: shootName,
      }
      return {
        shootRef,
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
    .intersection(['seedRef', 'shootRef'])
    .head()
    .value()
}

function getShootRef (managedSeed) {
  return {
    namespace: managedSeed.metadata.namespace,
    name: managedSeed.spec.shoot.name,
  }
}

export {
  getKubeApiServerHostForSeedOrManagedSeed,
  getKubeApiServerHostForShoot,
  getGardenTerminalHostClusterCredentials,
  getGardenHostClusterKubeApiServer,
  getShootRef,
}
