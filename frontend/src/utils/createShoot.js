//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Netmask } from 'netmask'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import uniq from 'lodash/uniq'
import compact from 'lodash/compact'
import find from 'lodash/find'
import some from 'lodash/some'
import sample from 'lodash/sample'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import range from 'lodash/range'

const defaultWorkerCIDR = '10.250.0.0/16'

export function getSpecTemplate (infrastructureKind) {
  switch (infrastructureKind) {
    case 'metal':
      return { // TODO: Remove when metal extension sets this config via mutating webhook, see https://github.com/metal-stack/gardener-extension-provider-metal/issues/32
        provider: getProviderTemplate(infrastructureKind),
        networking: {
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
              pool: 'vxlan'
            },
            typha: {
              enabled: true
            }
          }
        },
        kubernetes: {
          kubeControllerManager: {
            nodeCIDRMaskSize: 23
          },
          kubelet: {
            maxPods: 510
          }
        }
      }
    default:
      return {
        provider: getProviderTemplate(infrastructureKind),
        networking: {
          type: 'calico', // TODO: read nework extension list, see https://github.com/gardener/dashboard/issues/452
          nodes: defaultWorkerCIDR
        }
      }
  }
}

function getProviderTemplate (infrastructureKind) {
  switch (infrastructureKind) {
    case 'aws':
      return {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: defaultWorkerCIDR
            }
          }
        },
        controlPlaneConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'azure':
      return {
        type: 'azure',
        infrastructureConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vnet: {
              cidr: defaultWorkerCIDR
            },
            workers: defaultWorkerCIDR
          },
          zoned: true
        },
        controlPlaneConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'gcp':
      return {
        type: 'gcp',
        infrastructureConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: defaultWorkerCIDR
          }
        },
        controlPlaneConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'openstack':
      return {
        type: 'openstack',
        infrastructureConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: defaultWorkerCIDR
          }
        },
        controlPlaneConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'alicloud':
      return {
        type: 'alicloud',
        infrastructureConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: defaultWorkerCIDR
            }
          }
        },
        controlPlaneConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'metal':
      return {
        type: 'metal',
        infrastructureConfig: {
          apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig'
        },
        controlPlaneConfig: {
          apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
      }
    case 'vsphere':
      return {
        type: 'vsphere',
        controlPlaneConfig: {
          apiVersion: 'vsphere.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig'
        }
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
  for (var i = 0; i < numberOfNetworks; i++) {
    cidrArray.push(newCidrBlock.next(i).toString())
  }
  return cidrArray
}

export function getDefaultNetworkConfigurationForAllZones (numberOfZones, infrastructureKind, workerCIDR) {
  if (!workerCIDR) {
    workerCIDR = defaultWorkerCIDR
  }
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
          internal: internalNetwork
        }
      })
    }
    case 'alicloud': {
      const zoneNetworksAli = splitCIDR(workerCIDR, numberOfZones)
      return map(range(numberOfZones), index => {
        return {
          workers: zoneNetworksAli[index]
        }
      })
    }
  }
}

export function getDefaultZonesNetworkConfiguration (zones, infrastructureKind, maxNumberOfZones) {
  const zoneConfigurations = getDefaultNetworkConfigurationForAllZones(maxNumberOfZones, infrastructureKind)
  if (!zoneConfigurations) {
    return undefined
  }
  return map(zones, (zone, index) => {
    return {
      name: zone,
      ...zoneConfigurations[index]
    }
  })
}

export function findFreeNetworks (existingZonesNetworkConfiguration, workerCIDR, infrastructureKind, maxNumberOfZones) {
  if (!workerCIDR) {
    workerCIDR = defaultWorkerCIDR
  }
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

export function getZonesNetworkConfiguration (oldZonesNetworkConfiguration, newWorkers, infrastructureKind, maxNumberOfZones, existingShootWorkerCIDR) {
  const newUniqueZones = uniq(flatMap(newWorkers, 'zones'))
  if (!newUniqueZones || !infrastructureKind || !maxNumberOfZones) {
    return undefined
  }

  const defaultZonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(newUniqueZones, infrastructureKind, maxNumberOfZones)
  if (!defaultZonesNetworkConfiguration) {
    return undefined
  }

  const existingZonesNetworkConfiguration = compact(map(newUniqueZones, zone => {
    return find(oldZonesNetworkConfiguration, { name: zone })
  }))

  if (existingShootWorkerCIDR) {
    const freeZoneNetworks = findFreeNetworks(existingZonesNetworkConfiguration, existingShootWorkerCIDR, infrastructureKind, maxNumberOfZones)
    const availableNetworksLength = existingZonesNetworkConfiguration.length + freeZoneNetworks.length
    if (availableNetworksLength < newUniqueZones.length) {
      return undefined
    }
    const newZonesNetworkConfiguration = map(newUniqueZones, zone => {
      let zoneConfiguration = find(existingZonesNetworkConfiguration, { name: zone })
      if (zoneConfiguration) {
        return zoneConfiguration
      }
      zoneConfiguration = freeZoneNetworks.shift()
      return {
        name: zone,
        ...zoneConfiguration
      }
    })

    // order is important => keep oldZonesNetworkConfiguration order
    return uniq([...oldZonesNetworkConfiguration, ...newZonesNetworkConfiguration])
  }

  if (existingZonesNetworkConfiguration.length !== newUniqueZones.length) {
    return defaultZonesNetworkConfiguration
  }

  return existingZonesNetworkConfiguration
}

export function getControlPlaneZone (workers, infrastructureKind, oldControlPlaneZone) {
  const workerZones = flatMap(workers, 'zones')
  switch (infrastructureKind) {
    case 'gcp':
    case 'openstack':
    case 'alicloud':
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
        kind: 'WorkerConfig'
      }
    }
  }
}
