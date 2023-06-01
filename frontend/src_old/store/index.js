//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { listProjectTerminalShortcuts } from '@/utils/api'

// actions
export const actions = {
  fetchCloudProfiles ({ dispatch }) {
    return dispatch('cloudProfiles/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  async fetchGardenerExtensions ({ dispatch }) {
    try {
      await dispatch('gardenerExtensions/getAll')
    } catch (err) {
      dispatch('setError', err)
    }
  },
  async fetchSeeds ({ dispatch }) {
    try {
      await dispatch('seeds/getAll')
    } catch (err) {
      dispatch('setError', err)
    }
  },
  fetchProjects ({ dispatch }) {
    return dispatch('projects/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchMembers ({ dispatch, commit }) {
    return dispatch('members/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchcloudProviderSecrets ({ dispatch, commit }) {
    return dispatch('cloudProviderSecrets/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  getShootInfo ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/getInfo', { name, namespace })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setSelectedShoot ({ dispatch }, metadata) {
    return dispatch('shoots/setSelection', metadata)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  async setShootListFilters ({ dispatch, getters }, value) {
    try {
      await dispatch('shoots/setShootListFilters', value)
    } catch (err) {
      dispatch('setError', err)
    }
  },
  async setShootListFilter ({ dispatch, getters }, { filter, value }) {
    try {
      await dispatch('shoots/setShootListFilter', { filter, value })
    } catch (err) {
      dispatch('setError', err)
    }
  },
  createProject ({ dispatch, commit }, data) {
    return dispatch('projects/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project created', type: 'success' })
        return res
      })
  },
  patchProject ({ dispatch, commit }, data) {
    return dispatch('projects/patch', data)
  },
  updateProject ({ dispatch, commit }, data) {
    return dispatch('projects/update', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project updated', type: 'success' })
        return res
      })
  },
  deleteProject ({ dispatch, commit }, data) {
    return dispatch('projects/delete', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project deleted', type: 'success' })
        return res
      })
  },
  createCloudProviderSecret ({ dispatch, commit }, data) {
    return dispatch('cloudProviderSecrets/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Cloud Provider secret created', type: 'success' })
        return res
      })
  },
  updateCloudProviderSecret ({ dispatch, commit }, data) {
    return dispatch('cloudProviderSecrets/update', data)
      .then(res => {
        dispatch('setAlert', { message: 'Cloud Provider secret updated', type: 'success' })
        return res
      })
  },
  deleteCloudProviderSecret ({ dispatch, commit }, data) {
    return dispatch('cloudProviderSecrets/delete', data)
      .then(res => {
        dispatch('setAlert', { message: 'Cloud Provider secret deleted', type: 'success' })
        return res
      })
  },
  createShoot ({ dispatch, commit }, data) {
    return dispatch('shoots/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Cluster created', type: 'success' })
        return res
      })
  },
  deleteShoot ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/delete', { name, namespace })
      .then(res => {
        dispatch('setAlert', { message: 'Cluster marked for deletion', type: 'success' })
        return res
      })
  },
  subscribeShoots ({ dispatch, commit }) {
    (async () => {
      try {
        await dispatch('shoots/subscribe')
      } catch (err) {
        commit('SET_ALERT', { message: err.message, type: 'error' })
      }
    })()
  },
  unsubscribeShoots ({ dispatch, commit }) {
    (async () => {
      try {
        await dispatch('shoots/unsubscribe')
      } catch (err) {
        commit('SET_ALERT', { message: err.message, type: 'error' })
      }
    })()
  },
  async addMember ({ dispatch, commit }, payload) {
    const result = await dispatch('members/add', payload)
    await dispatch('setAlert', { message: 'Member added', type: 'success' })
    return result
  },
  async updateMember ({ dispatch, commit }, payload) {
    const result = await dispatch('members/update', payload)
    await dispatch('setAlert', { message: 'Member updated', type: 'success' })
    return result
  },
  async deleteMember ({ dispatch, commit }, payload) {
    try {
      const result = await dispatch('members/delete', payload)
      await dispatch('setAlert', { message: 'Member deleted', type: 'success' })
      return result
    } catch (err) {
      await dispatch('setError', { message: `Delete member failed. ${err.message}` })
    }
  },
  async resetServiceAccount ({ dispatch, commit }, payload) {
    try {
      const result = await dispatch('members/resetServiceAccount', payload)
      await dispatch('setAlert', { message: 'Service Account Reset', type: 'success' })
      return result
    } catch (err) {
      await dispatch('setError', { message: `Failed to Reset Service Account ${err.message}` })
    }
  },
  async setNamespace ({ dispatch, commit, state }, namespace) {
    if (namespace && state.namespace !== namespace) {
      commit('SET_NAMESPACE', namespace)
      await dispatch('refreshSubjectRules', namespace)
    }
    return state.namespace
  },
  async ensureProjectTerminalShortcutsLoaded ({ commit, dispatch, state }) {
    const { namespace, projectTerminalShortcuts } = state
    if (!projectTerminalShortcuts || projectTerminalShortcuts.namespace !== namespace) {
      try {
        const { data: items } = await listProjectTerminalShortcuts({ namespace })
        commit('SET_PROJECT_TERMINAL_SHORTCUTS', {
          namespace,
          items,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to list project terminal shortcuts:', err.message)
      }
    }
  },
}
