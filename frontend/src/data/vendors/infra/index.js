//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import aws from './aws'
import alicloud from './alicloud'
import azure from './azure'
import hcloud from './hcloud'
import gcp from './gcp'
import metal from './metal'
import openstack from './openstack'
import vsphere from './vsphere'
import ironcore from './ironcore'
import stackit from './stackit'
import local from './local'

export default [
  aws,
  alicloud,
  azure,
  hcloud,
  gcp,
  metal,
  openstack,
  vsphere,
  ironcore,
  stackit,
  local,
]
