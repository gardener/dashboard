//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import GSecretDialogWrapper from '@/components/Credentials/GSecretDialogWrapper'
import GSecretDialogGeneric from '@/components/Credentials/GSecretDialogGeneric'

describe('GSecretDialogWrapper', () => {
  function resolveDialog (visibleDialog) {
    return GSecretDialogWrapper.computed.resolvedComponent.call({ visibleDialog })
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
})
