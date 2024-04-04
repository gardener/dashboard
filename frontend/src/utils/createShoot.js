//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Netmask } from 'netmask'

import {
  map,
  flatMap,
  uniq,
  difference,
  some,
  sample,
  includes,
  filter,
  range,
  isEmpty,
  compact,
} from '@/lodash'

export function getSpecTemplate (...args) {
  const specTemplate = {
    provider: getProviderTemplate(...args),
    networking: getNetworkingTemplate(...args),
  }
  const kubernetesTemplate = getKubernetesTemplate(...args)
  if (kubernetesTemplate) {
    specTemplate.kubernetes = kubernetesTemplate
  }
  return specTemplate
}

export function getProviderTemplate (infrastructureKind, defaultWorkerCIDR) {
  switch (infrastructureKind) {
    case 'aws':
      return {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: defaultWorkerCIDR,
            },
          },
        },
        controlPlaneConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'azure':
      return {
        type: 'azure',
        infrastructureConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vnet: {
              cidr: defaultWorkerCIDR,
            },
            workers: defaultWorkerCIDR,
          },
          zoned: true,
        },
        controlPlaneConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'gcp':
      return {
        type: 'gcp',
        infrastructureConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: defaultWorkerCIDR,
          },
        },
        controlPlaneConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'openstack':
      return {
        type: 'openstack',
        infrastructureConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: defaultWorkerCIDR,
          },
        },
        controlPlaneConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'alicloud':
      return {
        type: 'alicloud',
        infrastructureConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: defaultWorkerCIDR,
            },
          },
        },
        controlPlaneConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'metal':
      return {
        type: 'metal',
        infrastructureConfig: {
          apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
        },
        controlPlaneConfig: {
          apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'vsphere':
      return {
        type: 'vsphere',
        controlPlaneConfig: {
          apiVersion: 'vsphere.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    case 'hcloud':
      return {
        type: 'hcloud',
        infrastructureConfig: {
          apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: defaultWorkerCIDR,
          },
        },
        controlPlaneConfig: {
          apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      }
    default:
      return {
        type: infrastructureKind,
      }
  }
}

export function getNetworkingTemplate (infrastructureKind, defaultWorkerCIDR) {
  switch (infrastructureKind) {
    case 'metal':
      return {
        type: 'calico',
        pods: '10.244.128.0/18',
        services: '10.244.192.0/18',
        providerConfig: {
          apiVersion: 'calico.networking.extensions.gardener.cloud/v1alpha1',
          kind: 'NetworkConfig',
          backend: 'vxlan',
          ipv4: {
            autoDetectionMethod: 'interface=lo',
            mode: 'Always',
            pool: 'vxlan',
          },
          typha: {
            enabled: true,
          },
        },
      }
    default:
      return {
        nodes: defaultWorkerCIDR,
      }
  }
}

export function getKubernetesTemplate (infrastructureKind, defaultWorkerCIDR) {
  switch (infrastructureKind) {
    case 'metal':
      return {
        kubeControllerManager: {
          nodeCIDRMaskSize: 23,
        },
        kubelet: {
          maxPods: 510,
        },
      }
  }
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

export function getDefaultNetworkConfigurationForAllZones (numberOfZones, infrastructureKind, workerCIDR) {
  switch (infrastructureKind) {
    case 'aws': {
      const zoneNetworksAws = splitCIDR(workerCIDR, numberOfZones)
      return map(range(numberOfZones), index => {
        const bigNetWorks = splitCIDR(zoneNetworksAws[index], 2)
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
        return {
          workers: zoneNetworksAli[index],
        }
      })
    }
  }
}

export function getDefaultZonesNetworkConfiguration (zones, infrastructureKind, maxNumberOfZones, workerCIDR) {
  const zoneConfigurations = getDefaultNetworkConfigurationForAllZones(maxNumberOfZones, infrastructureKind, workerCIDR)
  if (!zoneConfigurations) {
    return undefined
  }
  return map(zones, (zone, index) => {
    return {
      name: zone,
      ...zoneConfigurations[index],
    }
  })
}

export function findFreeNetworks (existingZonesNetworkConfiguration, workerCIDR, infrastructureKind, maxNumberOfZones) {
  if (!existingZonesNetworkConfiguration) {
    return getDefaultNetworkConfigurationForAllZones(maxNumberOfZones, infrastructureKind, workerCIDR)
  }
  for (let numberOfZones = maxNumberOfZones; numberOfZones >= existingZonesNetworkConfiguration.length; numberOfZones--) {
    const newZonesNetworkConfiguration = getDefaultNetworkConfigurationForAllZones(numberOfZones, infrastructureKind, workerCIDR)
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

export function getZonesNetworkConfiguration (oldZonesNetworkConfiguration, workers, infrastructureKind, maxNumberOfZones, existingShootWorkerCIDR, newShootWorkerCIDR) {
  if (isEmpty(workers) || !infrastructureKind || !maxNumberOfZones) {
    return
  }

  const usedZones = uniq(flatMap(workers, 'zones'))

  const workerCIDR = existingShootWorkerCIDR || newShootWorkerCIDR
  const defaultZonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(usedZones, infrastructureKind, maxNumberOfZones, workerCIDR)
  if (!defaultZonesNetworkConfiguration) {
    return
  }

  const existingZonesNetworkConfiguration = filter(oldZonesNetworkConfiguration, ({ name }) => includes(usedZones, name))

  if (existingShootWorkerCIDR) {
    const freeZoneNetworks = findFreeNetworks(existingZonesNetworkConfiguration, existingShootWorkerCIDR, infrastructureKind, maxNumberOfZones)
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

export function getControlPlaneZone (workers, infrastructureKind, oldControlPlaneZone) {
  const workerZones = uniq(flatMap(workers, 'zones'))
  switch (infrastructureKind) {
    case 'gcp':
    case 'hcloud':
      if (includes(workerZones, oldControlPlaneZone)) {
        return oldControlPlaneZone
      }
      return sample(workerZones)
    default:
      return undefined
  }
}

export function getWorkerProviderConfig (infrastructureKind) {
  switch (infrastructureKind) {
    case 'aws': {
      return {
        apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'WorkerConfig',
      }
    }
  }
}
