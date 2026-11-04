//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GCredentialDialogWrapper from '@/components/Credentials/GCredentialDialogWrapper'
import GSecretDialogDelete from '@/components/Credentials/GSecretDialogDelete'
import GSecretDialogGeneric from '@/components/Credentials/GSecretDialogGeneric'
import GSecretDialogHelpAlicloud from '@/components/Credentials/GSecretDialogHelpAlicloud'
import GSecretDialogHelpAws from '@/components/Credentials/GSecretDialogHelpAws'
import GSecretDialogMigration from '@/components/Credentials/GSecretDialogMigration'

describe('GCredentialDialogWrapper', () => {
  function createDialogState (providerType, overrides = {}) {
    return {
      operation: 'create',
      credentialKind: 'Secret',
      vendorType: 'infra',
      providerType,
      credential: undefined,
      binding: undefined,
      ...overrides,
    }
  }

  function resolveDialog (providerType, overrides) {
    const dialogState = createDialogState(providerType, overrides)
    return GCredentialDialogWrapper.computed.resolvedComponent.call({ dialogState })
  }

  function resolveHelp (providerType, overrides) {
    const dialogState = createDialogState(providerType, overrides)
    return GCredentialDialogWrapper.computed.resolvedHelpComponent.call({ dialogState })
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
    'alicloud-dns',
    'azure-dns',
    'azure-private-dns',
    'cloudflare-dns',
    'google-clouddns',
    'powerdns',
    'rfc2136',
    'stackit-dns',
  ])('uses the generic dialog for %s', providerType => {
    expect(resolveDialog(providerType)).toBe(resolveDialog('unknown-provider'))
  })

  it('routes delete and migration operations to the existing Secret dialogs', async () => {
    const deleteDialog = resolveDialog('aws', { operation: 'delete' })
    const migrationDialog = resolveDialog('aws', { operation: 'migrate-secret-binding' })

    expect(await deleteDialog.__asyncLoader()).toBe(GSecretDialogDelete)
    expect(await migrationDialog.__asyncLoader()).toBe(GSecretDialogMigration)
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

  it('does not add Secret help to non-form operations', () => {
    expect(resolveHelp('aws', { operation: 'delete' })).toBeUndefined()
    expect(resolveHelp('aws', { operation: 'migrate-secret-binding' })).toBeUndefined()
  })

  it('opens from dialog state and emits when the dialog closes', async () => {
    const wrapper = shallowMount(GCredentialDialogWrapper, {
      props: {
        dialogState: createDialogState('aws'),
      },
    })

    expect(wrapper.vm.visibleDialogState).toBe(true)

    await wrapper.setData({ visibleDialogState: false })

    expect(wrapper.emitted('dialog-closed')).toHaveLength(1)
  })
})
