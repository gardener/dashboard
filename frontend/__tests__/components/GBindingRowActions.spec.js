//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'

import { useAuthzStore } from '@/store/authz'
import { useCloudProfileStore } from '@/store/cloudProfile'
import { useCredentialStore } from '@/store/credential'

import GActionButton from '@/components/GActionButton.vue'
import GBindingRowActions from '@/components/Credentials/GBindingRowActions.vue'

import cloneDeep from 'lodash/cloneDeep'
import find from 'lodash/find'

describe('GBindingRowActions', () => {
  function mountBinding ({ credentialKind, orphaned = false, canPatchCredentials = true, canDeleteCredentials = true }) {
    const pinia = createTestingPinia({ stubActions: false })
    setActivePinia(pinia)

    const authzStore = useAuthzStore()
    authzStore.canPatchCredentials = canPatchCredentials
    authzStore.canDeleteCredentials = canDeleteCredentials

    const cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.list = fixtures.cloudprofiles

    const credentials = cloneDeep(fixtures.credentials)
    const binding = find(credentials.credentialsBindings, {
      credentialsRef: { kind: credentialKind },
    })
    if (orphaned) {
      const credentialList = credentialKind === 'Secret' ? 'secrets' : 'workloadIdentities'
      credentials[credentialList] = credentials[credentialList].filter(({ metadata }) => {
        return metadata.name !== binding.credentialsRef.name || metadata.namespace !== binding.credentialsRef.namespace
      })
    }
    useCredentialStore()._setCredentials(credentials)

    return shallowMount(GBindingRowActions, {
      props: { binding },
      global: { plugins: [pinia] },
    })
  }

  it('allows deleting an orphaned WorkloadIdentity binding', () => {
    const wrapper = mountBinding({ credentialKind: 'WorkloadIdentity', orphaned: true, canPatchCredentials: false })

    const actions = wrapper.findAllComponents(GActionButton)
    expect(actions).toHaveLength(1)
    expect(actions[0].props('icon')).toBe('mdi-delete')
  })

  it('shows disabled credential actions for an existing WorkloadIdentity', () => {
    const wrapper = mountBinding({ credentialKind: 'WorkloadIdentity' })

    const actions = wrapper.findAllComponents(GActionButton)
    expect(actions).toHaveLength(2)
    expect(actions.map(action => action.props('icon'))).toEqual(['mdi-pencil', 'mdi-delete'])
    expect(actions.every(action => action.props('disabled'))).toBe(true)
  })

  it.each([
    [false, false],
    [true, true],
  ])('uses the aggregate credential delete permission', (canDeleteCredentials, showsDeleteAction) => {
    const wrapper = mountBinding({ credentialKind: 'Secret', canDeleteCredentials })

    const deleteAction = wrapper.findAllComponents(GActionButton)
      .find(action => action.props('icon') === 'mdi-delete')
    expect(Boolean(deleteAction)).toBe(showsDeleteAction)
  })
})
