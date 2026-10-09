//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import GAwsWorkerVolumeIops from './aws/GAwsWorkerVolumeIops.vue'
import GGdchInfrastructureDetails from './gdch/GGdchInfrastructureDetails.vue'
import GMetalInfrastructureDetails from './metal/GMetalInfrastructureDetails.vue'
import GOpenstackInfrastructureDetails from './openstack/GOpenstackInfrastructureDetails.vue'
import GOpenstackShootInfrastructure from './openstack/GOpenstackShootInfrastructure.vue'

const registry = new Map([
  ['aws', {
    workerVolumeComponent: GAwsWorkerVolumeIops,
  }],
  ['gdch', {
    createInfrastructureDetailsComponent: GGdchInfrastructureDetails,
  }],
  ['metal', {
    createInfrastructureDetailsComponent: GMetalInfrastructureDetails,
  }],
  ['openstack', {
    createInfrastructureDetailsComponent: GOpenstackInfrastructureDetails,
    shootInfrastructureCardComponent: GOpenstackShootInfrastructure,
  }],
])

export function getInfrastructureProviderUi (providerType) {
  return registry.get(providerType)
}
