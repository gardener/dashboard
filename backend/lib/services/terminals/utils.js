
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
  getSeedIngressDomain,
  getShootIngressDomain
} = require('../../utils')
const assert = require('assert').strict
const { getSeed } = require('../../cache')

const GardenTerminalHostRefType = {
  SECRET_REF: 'secretRef',
  SEED_REF: 'seedRef',
  SHOOT_REF: 'shootRef'
}

/*
  Returns the secretRef for the cluster, that hosts the terminal pods for the (virtual)garden
*/
async function getGardenTerminalHostClusterSecretRef ({ coreClient }) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      const { items: runtimeSecrets } = await getGardenTerminalHostClusterSecrets({ coreClient })
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

async function getGardenHostClusterKubeApiServer ({ gardenClient, coreClient, shootsService }) {
  const refType = getGardenTerminalHostClusterRefType()

  switch (refType) {
    case GardenTerminalHostRefType.SECRET_REF: {
      return getConfigValue('terminal.gardenTerminalHost.apiServerIngressHost')
    }
    case GardenTerminalHostRefType.SEED_REF: {
      const seed = getSeedForGardenTerminalHostCluster()
      return getKubeApiServerHostForSeed({ gardenClient, coreClient, shootsService, seed })
    }
    case GardenTerminalHostRefType.SHOOT_REF: {
      const namespace = getConfigValue('terminal.gardenTerminalHost.shootRef.namespace', 'garden')
      const shootName = getConfigValue('terminal.gardenTerminalHost.shootRef.name')
      const shootResource = await shootsService.read({ gardenClient, namespace, name: shootName })
      return getKubeApiServerHostForShoot({ gardenClient, coreClient, shootResource })
    }
    default:
      assert.fail(`unknown refType ${refType}`)
  }
}

async function getKubeApiServerHostForSeed ({ gardenClient, coreClient, shootsService, seed }) {
  const name = seed.metadata.name
  const namespace = 'garden'

  const projectsClient = gardenClient.projects
  const namespacesClient = coreClient.namespaces

  let ingressDomain
  const isShootedSeed = await shootsService.exists({ gardenClient, namespace, name })
  if (isShootedSeed) {
    const shootResource = await shootsService.read({ gardenClient, namespace, name })
    ingressDomain = await getShootIngressDomain(projectsClient, namespacesClient, shootResource)
  } else {
    ingressDomain = await getSeedIngressDomain(seed)
  }

  return `k-${ingressDomain}`
}

async function getKubeApiServerHostForShoot ({ gardenClient, coreClient, shootResource }) {
  const projectsClient = gardenClient.projects
  const namespacesClient = coreClient.namespaces

  const ingressDomain = await getShootIngressDomain(projectsClient, namespacesClient, shootResource)
  return `k-${ingressDomain}`
}

function getGardenTerminalHostClusterRefType () {
  return _.chain(getConfigValue('terminal.gardenTerminalHost'))
    .keys()
    .intersection(['secretRef', 'seedRef', 'shootRef'])
    .head()
    .value()
}

function getGardenTerminalHostClusterSecrets ({ coreClient }) {
  const namespace = getConfigValue('terminal.gardenTerminalHost.secretRef.namespace', 'garden')
  assert.ok(namespace, 'namespace must be set')
  const labelSelector = getConfigValue('terminal.gardenTerminalHost.secretRef.labelSelector', ['runtime=gardenTerminalHost'])
  const qs = { labelSelector: labelSelector.join(',') }
  return coreClient.ns(namespace).secrets.get({ qs })
}

module.exports = {
  getGardenTerminalHostClusterSecretRef,
  getGardenTerminalHostClusterRefType,
  getGardenHostClusterKubeApiServer,
  getKubeApiServerHostForSeed,
  getKubeApiServerHostForShoot,
  GardenTerminalHostRefType
}
