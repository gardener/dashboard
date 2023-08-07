//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'
import { useAuthzStore } from './authz'
import { useAppStore } from './app'

export const useMemberStore = defineStore('member', () => {
  const api = useApi()
  const appStore = useAppStore()
  const authzStore = useAuthzStore()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const memberList = computed(() => {
    return list.value ?? []
  })

  async function fetchMembers () {
    const namespace = authzStore.namespace
    try {
      const response = await api.getMembers({ namespace })
      list.value = response.data
    } catch (err) {
      $reset()
      throw err
    }
  }

  async function addMember (data) {
    const namespace = authzStore.namespace
    const response = await api.addMember({ namespace, data })
    appStore.setSuccess('Member added')
    list.value = response.data
  }

  async function updateMember (name, data) {
    const namespace = authzStore.namespace
    const response = await api.updateMember({ namespace, name, data })
    appStore.setSuccess('Member updated')
    list.value = response.data
  }

  async function deleteMember (name) {
    const namespace = authzStore.namespace
    const response = await api.deleteMember({ namespace, name })
    appStore.setSuccess('Member deleted')
    list.value = response.data
  }

  async function resetServiceAccount (name) {
    try {
      const namespace = authzStore.namespace
      const response = await api.resetServiceAccount({ namespace, name })
      appStore.setSuccess('Service Account has been reset')
      list.value = response.data
    } catch (err) {
      appStore.setError({
        message: `Failed to reset Service Account: ${err.message}`,
      })
    }
  }

  function $reset () {
    list.value = null
  }

  return {
    list,
    isInitial,
    memberList,
    fetchMembers,
    addMember,
    updateMember,
    deleteMember,
    resetServiceAccount,
    $reset,
  }
})
