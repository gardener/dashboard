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
