//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import assign from 'lodash/assign'
import { getProjects, createProject, patchProject, updateProject, deleteProject, getResourceQuota } from '@/utils/api'
import { isNotFound } from '@/utils/error'

// initial state
const state = {
  all: []
}

// getters
const getters = {
  namespaces (state) {
    return state.all
  }
}

// actions
const actions = {
  async getAll ({ commit, state }) {
    const res = await getProjects()
    const list = res.data
    commit('RECEIVE', list)
    return state.all
  },
  async create ({ commit }, { metadata, data }) {
    const res = await createProject({ data: { metadata, data } })
    commit('ITEM_PUT', res.data)
    return res.data
  },
  async patch ({ commit, rootState }, { metadata, data }) {
    const namespace = metadata.namespace || rootState.namespace
    const res = await patchProject({ namespace, data: { metadata, data } })
    commit('ITEM_PUT', res.data)
    return res.data
  },
  async update ({ commit, rootState }, { metadata, data }) {
    const namespace = metadata.namespace || rootState.namespace
    const res = await updateProject({ namespace, data: { metadata, data } })
    commit('ITEM_PUT', res.data)
    return res.data
  },
  async delete ({ commit, state }, { metadata }) {
    const namespace = metadata.namespace
    await deleteProject({ namespace })
    // do not remove project from store as it will stay in termininating phase for a while
  },
  async getProjectQuota ({ commit, rootState }, { namespace, name }) {
    try {
      const { data } = await getResourceQuota({ namespace, name: 'gardener' })
      commit('RECEIVE_PROJECT_QUOTA', { name, data })
    } catch (error) {
      // ignore if no quota found
      if (isNotFound(error)) {
        return
      }
      throw error
    }
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  ITEM_PUT (state, newItem) {
    const predicate = item => item.metadata.name === newItem.metadata.name
    const index = findIndex(state.all, predicate)
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, newItem))
    } else {
      state.all.push(newItem)
    }
  },
  RECEIVE_PROJECT_QUOTA (state, { name, data }) {
    const predicate = item => item.metadata.name === name
    const item = find(state.all, predicate)
    if (item !== undefined) {
      Vue.set(item, 'quotaStatus', data.status)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
