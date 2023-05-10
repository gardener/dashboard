//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthzStore } from './authz'
import { useApi } from '@/composables'

export const useMemberStore = defineStore('member', () => {
  const api = useApi()
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
    list.value = response.data
  }

  async function updateMember (name, data) {
    const namespace = authzStore.namespace
    const response = await api.updateMember({ namespace, name, data })
    list.value = response.data
  }

  async function deleteMember (name) {
    const namespace = authzStore.namespace
    const response = await api.deleteMember({ namespace, name })
    list.value = response.data
  }

  async function resetServiceAccount (name) {
    const namespace = authzStore.namespace
    const response = await api.resetServiceAccount({ namespace, name })
    list.value = response.data
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
