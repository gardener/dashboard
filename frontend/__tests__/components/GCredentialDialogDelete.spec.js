//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import GCredentialDialogDelete from '@/components/Credentials/GCredentialDialogDelete.vue'

function deletesCredentialWithBinding (overrides = {}) {
  return GCredentialDialogDelete.computed.deletesCredentialWithBinding.call({
    binding: undefined,
    isOrphanedBinding: false,
    preserveCredential: false,
    ...overrides,
  })
}

describe('GCredentialDialogDelete', () => {
  it.each([
    [
      {},
      false,
    ],
    [
      { binding: {}, isOrphanedBinding: true },
      false,
    ],
    [
      { binding: {} },
      true,
    ],
  ])('determines whether the credential is deleted with its binding', (context, expected) => {
    expect(deletesCredentialWithBinding(context)).toBe(expected)
  })

  it('prevents duplicate submissions while deletion is running', async () => {
    const context = {
      loading: true,
      deleteDnsCredential: vi.fn(),
      deleteInfraCredential: vi.fn(),
    }

    await GCredentialDialogDelete.methods.onDelete.call(context)

    expect(context.deleteDnsCredential).not.toHaveBeenCalled()
    expect(context.deleteInfraCredential).not.toHaveBeenCalled()
  })

  it('deletes an infrastructure credential and closes only after success', async () => {
    const context = {
      loading: false,
      credential: undefined,
      binding: {},
      resourceKind: 'CredentialsBinding',
      resourceNamespace: 'garden-test',
      resourceName: 'credential',
      visible: true,
      deleteInfraCredential: vi.fn(),
      logger: { error: vi.fn() },
    }

    await GCredentialDialogDelete.methods.onDelete.call(context)

    expect(context.deleteInfraCredential).toHaveBeenCalledWith({
      bindingKind: 'CredentialsBinding',
      bindingNamespace: 'garden-test',
      bindingName: 'credential',
    })
    expect(context.visible).toBe(false)
    expect(context.loading).toBe(false)
  })

  it('shows a concise error and leaves the dialog open after failure', async () => {
    const context = {
      loading: false,
      credential: undefined,
      binding: {},
      resourceKind: 'SecretBinding',
      resourceNamespace: 'garden-test',
      resourceName: 'credential',
      visible: true,
      deleteInfraCredential: vi.fn().mockRejectedValue(new Error('forbidden')),
      logger: { error: vi.fn() },
    }

    await GCredentialDialogDelete.methods.onDelete.call(context)

    expect(context.errorMessage).toBe('Failed to delete credential binding.')
    expect(context.visible).toBe(true)
    expect(context.loading).toBe(false)
  })
})
