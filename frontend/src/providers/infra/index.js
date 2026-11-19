//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import * as defaultExtension from './default/shoot'
import * as alicloud from './alicloud/shoot'
import * as aws from './aws/shoot'
import * as azure from './azure/shoot'
import * as gcp from './gcp/shoot'
import * as gdch from './gdch/shoot'
import * as hcloud from './hcloud/shoot'
import * as local from './local/shoot'
import * as metal from './metal/shoot'
import * as openstack from './openstack/shoot'
import * as stackit from './stackit/shoot'
import { createGdchInfrastructureDetailsContext } from './gdch/useShootInfrastructureDetails'
import { createMetalInfrastructureDetailsContext } from './metal/useShootInfrastructureDetails'
import { createOpenstackInfrastructureDetailsContext } from './openstack/useShootInfrastructureDetails'

/**
 * Hooks that customize Shoot behavior for an infrastructure provider.
 *
 * @typedef {Object} InfrastructureProviderExtension
 * @property {Function} createShootSpec - Creates the provider-owned parts of a new Shoot spec.
 * @property {Function} isZoned - Determines whether the Shoot supports zoned worker groups.
 * @property {Function} resolveZoneNetworkWorkerCIDR - Resolves the parent CIDR used for zone networks.
 * @property {Function} isRegionSupported - Determines whether a CloudProfile region can be selected.
 * @property {Function} [createZoneNetworks] - Creates provider-specific network configuration for each zone.
 * @property {Function} [resolveControlPlaneZone] - Resolves a provider-specific control-plane zone.
 * @property {Function} [createWorkerConfig] - Creates provider-specific worker configuration.
 */

// Provider shoot modules define extension hooks. Keep implementation helpers
// private because every named export becomes part of the extension object.
const registry = new Map([
  ['alicloud', alicloud],
  ['aws', aws],
  ['azure', azure],
  ['gcp', gcp],
  ['gdch', {
    ...gdch,
    createInfrastructureDetailsContext: createGdchInfrastructureDetailsContext,
  }],
  ['hcloud', hcloud],
  ['local', local],
  ['metal', {
    ...metal,
    createInfrastructureDetailsContext: createMetalInfrastructureDetailsContext,
  }],
  ['openstack', {
    ...openstack,
    createInfrastructureDetailsContext: createOpenstackInfrastructureDetailsContext,
  }],
  ['stackit', stackit],
])

/**
 * Returns the provider extension merged with the default Shoot behavior.
 *
 * @param {string} providerType - Infrastructure provider type.
 * @returns {InfrastructureProviderExtension} Provider-specific and default hooks.
 */
export function getInfrastructureProviderExtension (providerType) {
  return {
    ...defaultExtension,
    ...registry.get(providerType),
  }
}

export function createInfrastructureDetailsContexts (options) {
  return new Map(
    [...registry]
      .filter(([, extension]) => extension.createInfrastructureDetailsContext)
      .map(([providerType, extension]) => [
        providerType,
        extension.createInfrastructureDetailsContext(options),
      ]),
  )
}
