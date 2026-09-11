import awsRoute53 from './aws-route53'
import azureDns from './azure-dns'
import azurePrivateDns from './azure-private-dns'
import googleCloudDns from './google-clouddns'
import openstackDesignate from './openstack-designate'
import alicloudDns from './alicloud-dns'
import cloudflareDns from './cloudflare'
import netlifyDns from './netlify'
import powerdns from './powerdns'
import rfc2136 from './rfc2136'
import stackitDns from './stackit-dns'

export default [
  awsRoute53,
  azureDns,
  azurePrivateDns,
  googleCloudDns,
  openstackDesignate,
  alicloudDns,
  cloudflareDns,
  netlifyDns,
  powerdns,
  rfc2136,
  stackitDns,
]
