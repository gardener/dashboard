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

const registry = new Map([
  ['alicloud', alicloud],
  ['aws', aws],
  ['azure', azure],
  ['gcp', gcp],
  ['gdch', gdch],
  ['hcloud', hcloud],
  ['local', local],
  ['metal', metal],
  ['openstack', openstack],
  ['stackit', stackit],
])

export function getInfrastructureProviderExtension (providerType) {
  return {
    ...defaultExtension,
    ...registry.get(providerType),
  }
}
