//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import awsRoute53 from './aws-route53'
import alicloudDns from './alicloud-dns'
import azureDns from './azure-dns'
import azurePrivateDns from './azure-private-dns'
import cloudflareDns from './cloudflare'
import rfc2136 from './rfc2136'
import googleCloudDns from './google-clouddns'
import infoblox from './infoblox'
import netlify from './netlify'
import powerdns from './powerdns'
import openstackDesignate from './openstack-designate'

export default [
  awsRoute53,
  alicloudDns,
  azureDns,
  azurePrivateDns,
  cloudflareDns,
  rfc2136,
  googleCloudDns,
  infoblox,
  netlify,
  powerdns,
  openstackDesignate,
]
