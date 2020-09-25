//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assign from 'lodash/assign'
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import matches from 'lodash/matches'
import { getInfrastructureSecrets, updateInfrastructureSecret, createInfrastructureSecret, deleteInfrastructureSecret } from '@/utils/api'

const eqlBindingNameAndNamespace = ({ bindingNamespace, bindingName }) => {
  return matches({ metadata: { bindingNamespace, bindingName } })
}

// initial state
const state = {
  all: []
}

// getters
const getters = {
  getInfrastructureSecretByBindingName: (state) => ({ name, namespace }) => {
    return find(state.all, eqlBindingNameAndNamespace({ bindingName: name, bindingNamespace: namespace }))
  }
}

// actions
const actions = {
  getAll: ({ commit, rootState }) => {
    const namespace = rootState.namespace
    return getInfrastructureSecrets({ namespace })
      .then(res => {
        commit('RECEIVE', res.data)
        return state.all
      })
      .catch(error => {
        commit('CLEAR')
        throw error
      })
  },
  update: ({ commit, rootState }, { metadata, data }) => {
    const namespace = metadata.namespace || rootState.namespace
    const bindingName = metadata.bindingName
    return updateInfrastructureSecret({ namespace, bindingName, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  create: ({ commit, rootState }, { metadata, data }) => {
    const namespace = metadata.namespace || rootState.namespace
    return createInfrastructureSecret({ namespace, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  delete ({ dispatch, commit, rootState }, bindingName) {
    const namespace = rootState.namespace
    return deleteInfrastructureSecret({ namespace, bindingName })
      .then(res => {
        commit('ITEM_DELETED', res.data)
        return res.data
      })
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  CLEAR (state) {
    state.all = []
  },
  ITEM_PUT (state, newItem) {
    const iteratee = item => item.metadata.name === newItem.metadata.name
    const index = findIndex(state.all, iteratee)
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, newItem))
    } else {
      state.all.push(newItem)
    }
  },
  ITEM_DELETED (state, deletedItem) {
    const predicate = item => item.metadata.name === deletedItem.metadata.name
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
