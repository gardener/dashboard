//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import {
  flushPromises,
  shallowMount,
} from '@vue/test-utils'
import { ref } from 'vue'

import { useCredentialStore } from '@/store/credential'

import GMessage from '@/components/GMessage.vue'
import GCredentialDialogDelete from '@/components/Credentials/GCredentialDialogDelete.vue'

const composableMocks = vi.hoisted(() => ({
  useCloudProviderBinding: vi.fn(),
  useDnsProviderCredential: vi.fn(),
}))

vi.mock('@/composables/credential/useCloudProviderBinding', () => ({
  useCloudProviderBinding: composableMocks.useCloudProviderBinding,
}))

vi.mock('@/composables/credential/useDnsProviderCredential', () => ({
  useDnsProviderCredential: composableMocks.useDnsProviderCredential,
}))

const { createVuetifyPlugin } = global.fixtures.helper
const slotStub = { template: '<div><slot /></div>' }
const VBtnStub = {
  name: 'VBtn',
  props: {
    disabled: Boolean,
  },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

function mountDialog ({
  binding,
  credential,
  bindingsWithSameCredential = [],
  isOrphanedBinding = false,
  resourceKind = binding?.kind ?? credential?.kind,
  resourceName = binding?.metadata.name ?? credential?.metadata.name,
  resourceNamespace = binding?.metadata.namespace ?? credential?.metadata.namespace,
  credentialName = binding?.credentialsRef?.name ?? binding?.secretRef?.name ?? credential?.metadata.name,
} = {}) {
  const composable = {
    bindingsWithSameCredential: ref(bindingsWithSameCredential),
    credentialName: ref(credentialName),
    isOrphanedBinding: ref(isOrphanedBinding),
    resourceKind: ref(resourceKind),
    resourceName: ref(resourceName),
    resourceNamespace: ref(resourceNamespace),
  }
  composableMocks.useCloudProviderBinding.mockReturnValue(composable)
  composableMocks.useDnsProviderCredential.mockReturnValue(composable)

  const pinia = createTestingPinia()
  setActivePinia(pinia)
  const logger = { error: vi.fn() }
  const wrapper = shallowMount(GCredentialDialogDelete, {
    props: {
      modelValue: true,
      binding,
      credential,
    },
    global: {
      plugins: [
        pinia,
        createVuetifyPlugin(),
      ],
      provide: { logger },
      stubs: {
        VAlert: slotStub,
        VBtn: VBtnStub,
        VCard: slotStub,
        VCardActions: slotStub,
        VCardText: slotStub,
        VContainer: slotStub,
        VDialog: slotStub,
      },
    },
  })

  return {
    credentialStore: useCredentialStore(),
    logger,
    wrapper,
  }
}

function binding (kind = 'CredentialsBinding') {
  const credentialRef = { name: 'test-secret' }
  return {
    kind,
    metadata: {
      name: 'test-binding',
      namespace: 'garden-test',
    },
    ...(kind === 'SecretBinding'
      ? { secretRef: credentialRef }
      : { credentialsRef: credentialRef }),
  }
}

function credential () {
  return {
    kind: 'Secret',
    metadata: {
      name: 'test-secret',
      namespace: 'garden-test',
    },
  }
}

function deleteButton (wrapper) {
  return wrapper.findAllComponents({ name: 'VBtn' })
    .find(button => button.text() === 'Delete')
}

describe('GCredentialDialogDelete', () => {
  it.each([
    [
      { binding: binding() },
      'delete test-secret and its associated CredentialsBinding',
    ],
    [
      { binding: binding(), isOrphanedBinding: true },
      'delete the CredentialsBinding test-binding',
    ],
    [
      { binding: binding(), bindingsWithSameCredential: [binding('SecretBinding')] },
      'Only this CredentialsBinding will be deleted. The Secret will be preserved.',
    ],
    [
      { credential: credential() },
      'delete test-secret',
    ],
  ])('explains the deletion outcome', (options, message) => {
    const { wrapper } = mountDialog(options)

    expect(wrapper.text()).toContain(message)
  })

  it('prevents duplicate submissions while deletion is running', async () => {
    let resolveDeletion
    const deletion = new Promise(resolve => {
      resolveDeletion = resolve
    })
    const { credentialStore, wrapper } = mountDialog({ binding: binding() })
    credentialStore.deleteInfraCredential.mockReturnValue(deletion)
    const button = deleteButton(wrapper)

    await button.trigger('click')
    await button.trigger('click')

    expect(credentialStore.deleteInfraCredential).toHaveBeenCalledOnce()
    resolveDeletion()
    await flushPromises()
  })

  it('deletes an infrastructure credential and closes only after success', async () => {
    const { credentialStore, wrapper } = mountDialog({ binding: binding() })

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(credentialStore.deleteInfraCredential).toHaveBeenCalledWith({
      bindingKind: 'CredentialsBinding',
      bindingNamespace: 'garden-test',
      bindingName: 'test-binding',
      preserveCredential: false,
    })
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('requests binding-only deletion when another binding references the credential', async () => {
    const { credentialStore, wrapper } = mountDialog({
      binding: binding('SecretBinding'),
      bindingsWithSameCredential: [binding()],
    })

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(credentialStore.deleteInfraCredential).toHaveBeenCalledWith({
      bindingKind: 'SecretBinding',
      bindingNamespace: 'garden-test',
      bindingName: 'test-binding',
      preserveCredential: true,
    })
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('deletes a DNS credential', async () => {
    const { credentialStore, wrapper } = mountDialog({ credential: credential() })

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(credentialStore.deleteDnsCredential).toHaveBeenCalledWith({
      credentialKind: 'Secret',
      credentialNamespace: 'garden-test',
      credentialName: 'test-secret',
    })
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('shows a concise error and leaves the dialog open after failure', async () => {
    const { credentialStore, logger, wrapper } = mountDialog({ binding: binding('SecretBinding') })
    credentialStore.deleteInfraCredential.mockRejectedValue(new Error('forbidden'))

    await deleteButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(GMessage).props('message')).toBe('Failed to delete credential binding.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(logger.error).toHaveBeenCalledOnce()
  })
})
