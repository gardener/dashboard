//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Netmask } from 'netmask'

import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import uniq from 'lodash/uniq'
import difference from 'lodash/difference'
import some from 'lodash/some'
import sample from 'lodash/sample'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import range from 'lodash/range'
import isEmpty from 'lodash/isEmpty'
import compact from 'lodash/compact'

const DEFAULT_WORKER_CIDR_PLACEHOLDER = '__DEFAULT_WORKER_CIDR__'

function replacePlaceholderInTemplate (value, defaultWorkerCIDR) {
  if (typeof value === 'string') {
    return value === DEFAULT_WORKER_CIDR_PLACEHOLDER ? defaultWorkerCIDR : value
  }
  if (Array.isArray(value)) {
    return map(value, item => replacePlaceholderInTemplate(item, defaultWorkerCIDR))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        return [key, replacePlaceholderInTemplate(nestedValue, defaultWorkerCIDR)]
      }),
    )
  }
  return value
}

export function getSpecTemplate (providerType, defaultWorkerCIDR, shootVendor) {
  const spec = {
    provider: getProviderTemplate(providerType, defaultWorkerCIDR, shootVendor),
    networking: getNetworkingTemplate(providerType, defaultWorkerCIDR, shootVendor),
  }
  const kubernetes = getKubernetesTemplate(shootVendor)
  if (!isEmpty(kubernetes)) {
    spec.kubernetes = kubernetes
  }
  return spec
}

export function getProviderTemplate (providerType, defaultWorkerCIDR, shootVendor) {
  const template = shootVendor?.shoot?.templates?.provider
  if (!template) {
    return {
      type: providerType,
    }
  }

  return replacePlaceholderInTemplate(template, defaultWorkerCIDR)
}

export function getNetworkingTemplate (providerType, defaultWorkerCIDR, shootVendor) {
  const template = shootVendor?.shoot?.templates?.networking
  if (!template) {
    return {
      nodes: defaultWorkerCIDR,
    }
  }

  return replacePlaceholderInTemplate(template, defaultWorkerCIDR)
}

export function getKubernetesTemplate (shootVendor) {
  return shootVendor?.shoot?.templates?.kubernetes
}

export function splitCIDR (cidrToSplitStr, numberOfNetworks) {
  if (numberOfNetworks < 1) {
    return []
  }
  const cidrToSplit = new Netmask(cidrToSplitStr)
  const numberOfSplits = Math.ceil(Math.log(numberOfNetworks) / Math.log(2))
  const newBitmask = cidrToSplit.bitmask + numberOfSplits
  if (newBitmask > 32) {
    throw new Error(`Could not split CIDR into ${numberOfNetworks} networks: Not enough bits available`)
  }
  const newCidrBlock = new Netmask(`${cidrToSplit.base}/${newBitmask}`)
  const cidrArray = []
  for (let i = 0; i < numberOfNetworks; i++) {
    cidrArray.push(newCidrBlock.next(i).toString())
  }
  return cidrArray
}

export function getDefaultNetworkConfigurationForAllZones (numberOfZones, workerCIDR, shootVendor) {
  switch (shootVendor?.shoot?.zoneNetworking?.strategy) {
    case 'aws': {
      const zoneNetworksAws = splitCIDR(workerCIDR, numberOfZones)
      return map(range(numberOfZones), index => {
        const zoneNetwork = zoneNetworksAws[index] // eslint-disable-line security/detect-object-injection
        const bigNetWorks = splitCIDR(zoneNetwork, 2)
        const workerNetwork = bigNetWorks[0]
        const smallNetworks = splitCIDR(bigNetWorks[1], 2)
        const publicNetwork = smallNetworks[0]
        const internalNetwork = smallNetworks[1]
        return {
          workers: workerNetwork,
          public: publicNetwork,
          internal: internalNetwork,
        }
      })
    }
    case 'alicloud': {
      const zoneNetworksAli = splitCIDR(workerCIDR, numberOfZones)
      return map(range(numberOfZones), index => {
        const zoneNetwork = zoneNetworksAli[index] // eslint-disable-line security/detect-object-injection
        return {
          workers: zoneNetwork,
        }
      })
    }
  }
}

export function getDefaultZonesNetworkConfiguration (zones, maxNumberOfZones, workerCIDR, shootVendor) {
  const zoneConfigurations = getDefaultNetworkConfigurationForAllZones(maxNumberOfZones, workerCIDR, shootVendor)
  if (!zoneConfigurations) {
    return undefined
  }
  return map(zones, (zone, index) => {
    const zoneConfiguration = zoneConfigurations[index] // eslint-disable-line security/detect-object-injection
    return {
      name: zone,
      ...zoneConfiguration,
    }
  })
}

export function findFreeNetworks (existingZonesNetworkConfiguration, workerCIDR, maxNumberOfZones, shootVendor) {
  if (!existingZonesNetworkConfiguration) {
    return getDefaultNetworkConfigurationForAllZones(maxNumberOfZones, workerCIDR, shootVendor)
  }
  for (let numberOfZones = maxNumberOfZones; numberOfZones >= existingZonesNetworkConfiguration.length; numberOfZones--) {
    const newZonesNetworkConfiguration = getDefaultNetworkConfigurationForAllZones(numberOfZones, workerCIDR, shootVendor)
    const freeZoneNetworks = filter(newZonesNetworkConfiguration, networkConfiguration => {
      return !some(existingZonesNetworkConfiguration, networkConfiguration)
    })
    const matchesExistingZoneNetworkSize = newZonesNetworkConfiguration.length - freeZoneNetworks.length === existingZonesNetworkConfiguration.length
    if (newZonesNetworkConfiguration && freeZoneNetworks && matchesExistingZoneNetworkSize) {
      return freeZoneNetworks
    }
  }
  return []
}

export function getZonesNetworkConfiguration (oldZonesNetworkConfiguration, workers, maxNumberOfZones, existingShootWorkerCIDR, newShootWorkerCIDR, shootVendor) {
  if (isEmpty(workers) || !maxNumberOfZones) {
    return
  }

  const usedZones = uniq(flatMap(workers, 'zones'))

  const workerCIDR = existingShootWorkerCIDR || newShootWorkerCIDR
  const defaultZonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(usedZones, maxNumberOfZones, workerCIDR, shootVendor)
  if (!defaultZonesNetworkConfiguration) {
    return
  }

  const existingZonesNetworkConfiguration = filter(oldZonesNetworkConfiguration, ({ name }) => includes(usedZones, name))

  if (existingShootWorkerCIDR) {
    const freeZoneNetworks = findFreeNetworks(existingZonesNetworkConfiguration, existingShootWorkerCIDR, maxNumberOfZones, shootVendor)
    const availableNetworksLength = existingZonesNetworkConfiguration.length + freeZoneNetworks.length
    if (availableNetworksLength < usedZones.length) {
      return
    }
    const existingZones = map(existingZonesNetworkConfiguration, 'name')
    const newZones = difference(usedZones, existingZones)
    const newZonesNetworkConfiguration = map(newZones, name => {
      return {
        name,
        ...freeZoneNetworks.shift(),
      }
    })
    // order is important => keep oldZonesNetworkConfiguration order
    return [
      ...oldZonesNetworkConfiguration,
      ...newZonesNetworkConfiguration,
    ]
  }

  if (existingZonesNetworkConfiguration.length !== usedZones.length) {
    return defaultZonesNetworkConfiguration
  }

  const shootCIDR = new Netmask(newShootWorkerCIDR)
  const usedCIDRS = flatMap(existingZonesNetworkConfiguration, zone => compact([zone.workers, zone.public, zone.internal]))
  const zoneConfigurationContainsInvalidCIDR = some(usedCIDRS, cidr => !shootCIDR.contains(cidr))
  return zoneConfigurationContainsInvalidCIDR
    ? defaultZonesNetworkConfiguration
    : existingZonesNetworkConfiguration
}

export function getControlPlaneZone (workers, shootVendor, oldControlPlaneZone) {
  const workerZones = uniq(flatMap(workers, 'zones'))
  switch (shootVendor?.shoot?.controlPlane?.zoneStrategy) {
    case 'worker-zones':
      if (includes(workerZones, oldControlPlaneZone)) {
        return oldControlPlaneZone
      }
      return sample(workerZones)
    default:
      return undefined
  }
}

export function getWorkerProviderConfig (shootVendor) {
  return shootVendor?.shoot?.workerProviderConfig
}
