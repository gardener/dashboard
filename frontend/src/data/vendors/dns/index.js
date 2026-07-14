//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import awsRoute53 from './aws-route53'
import azureDns from './azure-dns'
import azurePrivateDns from './azure-private-dns'
import googleCloudDns from './google-clouddns'
import openstackDesignate from './openstack-designate'
import alicloudDns from './alicloud-dns'
import cloudflareDns from './cloudflare'
import infobloxDns from './infoblox'
import netlifyDns from './netlify'
import powerdns from './powerdns'
import rfc2136 from './rfc2136'

export default [
  awsRoute53,
  azureDns,
  azurePrivateDns,
  googleCloudDns,
  openstackDesignate,
  alicloudDns,
  cloudflareDns,
  infobloxDns,
  netlifyDns,
  powerdns,
  rfc2136,
]
