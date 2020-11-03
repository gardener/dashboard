//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import findIndex from 'lodash/findIndex'
import assign from 'lodash/assign'
import { getProjects, createProject, patchProject, updateProject, deleteProject } from '@/utils/api'

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
  async getAll ({ commit, rootState }) {
    const res = await getProjects()
    const list = res.data
    commit('RECEIVE', list)
    return state.all
  },
  async create ({ commit, rootState }, { metadata, data }) {
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
  async delete ({ commit, rootState }, { metadata }) {
    const namespace = metadata.namespace
    await deleteProject({ namespace })
    commit('ITEM_DELETED', metadata)
    return state.all
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
  ITEM_DELETED (state, metadata) {
    const predicate = item => item.metadata.namespace === metadata.namespace
    const index = findIndex(state.all, predicate)
    if (index !== -1) {
      state.all.splice(index, 1)
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
