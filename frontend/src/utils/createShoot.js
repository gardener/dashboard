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

import { Netmask } from 'netmask'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import uniq from 'lodash/uniq'
import compact from 'lodash/compact'
import find from 'lodash/find'
import sample from 'lodash/sample'
import includes from 'lodash/includes'

export const workerCIDR = '10.250.0.0/16'

export function getProviderTemplate (infrastructureKind) {
  switch (infrastructureKind) {
    case 'aws':
      return {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: workerCIDR
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
              cidr: workerCIDR
            },
            workers: workerCIDR
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
            worker: workerCIDR
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
            worker: workerCIDR
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
              cidr: workerCIDR
            }
          }
        },
        controlPlaneConfig: {
          apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
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

export function getDefaultZonesNetworkConfiguration (zones, infrastructureKind, maxNumberOfZones) {
  switch (infrastructureKind) {
    case 'aws':
      const zoneNetworksAws = splitCIDR(workerCIDR, maxNumberOfZones)
      return map(zones, (zone, index) => {
        const bigNetWorks = splitCIDR(zoneNetworksAws[index], 2)
        const workerNetwork = bigNetWorks[0]
        const smallNetworks = splitCIDR(bigNetWorks[1], 2)
        const publicNetwork = smallNetworks[0]
        const internalNetwork = smallNetworks[1]
        return {
          name: zone,
          workers: workerNetwork,
          public: publicNetwork,
          internal: internalNetwork
        }
      })
    case 'alicloud':
      const zoneNetworksAli = splitCIDR(workerCIDR, maxNumberOfZones)
      return map(zones, (zone, index) => {
        return {
          name: zone,
          worker: zoneNetworksAli[index]
        }
      })
    default:
      return undefined
  }
}

export function getZonesNetworkConfiguration (oldZonesNetworkConfiguration, newWorkers, infrastructureKind, maxNumberOfZones) {
  const newZones = uniq(flatMap(newWorkers, 'zones'))
  if (!newZones || !infrastructureKind || !maxNumberOfZones) {
    return undefined
  }

  const defaultZonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(newZones, infrastructureKind, maxNumberOfZones)
  if (!defaultZonesNetworkConfiguration) {
    return undefined
  }
  const newZonesNetworkConfiguration = compact(map(newZones, zone => {
    return find(oldZonesNetworkConfiguration, { name: zone })
  }))
  if (newZonesNetworkConfiguration.length !== newZones.length) {
    return defaultZonesNetworkConfiguration
  }
  return newZonesNetworkConfiguration
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
