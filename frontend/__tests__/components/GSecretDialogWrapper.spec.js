//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GSecretDialogGeneric from '@/components/Credentials/GSecretDialogGeneric'
import GSecretDialogHelpAlicloud from '@/components/Credentials/GSecretDialogHelpAlicloud'
import GSecretDialogHelpAws from '@/components/Credentials/GSecretDialogHelpAws'

describe('GSecretDialogWrapper', () => {
  function resolveDialog (visibleDialog) {
    return GSecretDialogWrapper.computed.resolvedComponent.call({ visibleDialog })
  }

  function resolveHelp (visibleDialog) {
    return GSecretDialogWrapper.computed.resolvedHelpComponent.call({ visibleDialog })
  }

  it('uses the generic dialog for Netlify DNS', async () => {
    const netlifyDialog = resolveDialog('netlify-dns')

    expect(netlifyDialog).toBe(resolveDialog('unknown-provider'))
    expect(await netlifyDialog.__asyncLoader()).toBe(GSecretDialogGeneric)
  })

  it('keeps OpenStack on its dedicated dialog', () => {
    const genericDialog = resolveDialog('unknown-provider')
    const openstackDialog = resolveDialog('openstack')

    expect(resolveDialog('openstack-designate')).toBe(openstackDialog)
    expect(openstackDialog).not.toBe(genericDialog)
  })

  it('uses a dedicated dialog only for GDCH DNS', () => {
    const genericDialog = resolveDialog('unknown-provider')
    const gdchDnsDialog = resolveDialog('gdch-dns')

    expect(gdchDnsDialog).not.toBe(genericDialog)
  })

  it.each([
    'alicloud',
    'azure',
    'gcp',
    'gdch',
    'hcloud',
    'metal',
    'stackit',
    'vsphere',
    'alicloud-dns',
    'azure-dns',
    'azure-private-dns',
    'cloudflare-dns',
    'google-clouddns',
    'infoblox-dns',
    'powerdns',
    'rfc2136',
    'stackit-dns',
  ])('uses the generic dialog for %s', providerType => {
    expect(resolveDialog(providerType)).toBe(resolveDialog('unknown-provider'))
  })

  it('uses dedicated help only for Alibaba Cloud infrastructure', async () => {
    const alicloudHelp = resolveHelp('alicloud')

    expect(resolveHelp('alicloud-dns')).toBeUndefined()
    expect(await alicloudHelp.__asyncLoader()).toBe(GSecretDialogHelpAlicloud)
  })

  it('uses the generic dialog with dedicated help for AWS providers', async () => {
    const genericDialog = resolveDialog('unknown-provider')
    const awsHelp = resolveHelp('aws')

    expect(resolveDialog('aws')).toBe(genericDialog)
    expect(resolveDialog('aws-route53')).toBe(genericDialog)
    expect(resolveHelp('aws-route53')).toBe(awsHelp)
    expect(resolveHelp('unknown-provider')).toBeUndefined()
    expect(await awsHelp.__asyncLoader()).toBe(GSecretDialogHelpAws)
  })
})
