//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { shallowMount } from '@vue/test-utils'

import { useAuthzStore } from '@/store/authz'

import GActionButton from '@/components/GActionButton.vue'
import GCredentialRowActions from '@/components/Credentials/GCredentialRowActions.vue'

describe('GCredentialRowActions', () => {
  it('shows disabled actions for a WorkloadIdentity credential', () => {
    const pinia = createTestingPinia({ stubActions: false })
    setActivePinia(pinia)

    const authzStore = useAuthzStore()
    authzStore.canPatchCredentials = true
    authzStore.canDeleteCredentials = true

    const credential = {
      apiVersion: 'security.gardener.cloud/v1alpha1',
      kind: 'WorkloadIdentity',
      metadata: {
        name: 'dns-workload-identity',
        namespace: 'garden-test',
      },
    }
    const wrapper = shallowMount(GCredentialRowActions, {
      props: { credential },
      global: { plugins: [pinia] },
    })

    const actions = wrapper.findAllComponents(GActionButton)
    expect(actions).toHaveLength(2)
    expect(actions.map(action => action.props('icon'))).toEqual(['mdi-pencil', 'mdi-delete'])
    expect(actions.every(action => action.props('disabled'))).toBe(true)
  })
})
