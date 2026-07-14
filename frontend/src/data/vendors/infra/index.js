//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import aws from './aws'
import azure from './azure'
import gcp from './gcp'
import openstack from './openstack'
import alicloud from './alicloud'
import metal from './metal'
import vsphere from './vsphere'
import hcloud from './hcloud'
import onmetal from './onmetal'
import ironcore from './ironcore'
import stackit from './stackit'
import local from './local'

export default [
  aws,
  azure,
  gcp,
  openstack,
  alicloud,
  metal,
  vsphere,
  hcloud,
  onmetal,
  ironcore,
  stackit,
  local,
]
