//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assign from 'lodash/assign'
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import matches from 'lodash/matches'
import { getCloudProviderSecrets, updateCloudProviderSecret, createCloudProviderSecret, deleteCloudProviderSecret } from '@/utils/api'

const eqlNameAndNamespace = ({ namespace, name }) => {
  return matches({ metadata: { namespace, name } })
}

// initial state
const state = {
  all: []
}

// getters
const getters = {
  getCloudProviderSecretByName (state) {
    return ({ name, namespace }) => find(state.all, eqlNameAndNamespace({ name, namespace }))
  }
}

// actions
const actions = {
  getAll: ({ commit, state, rootState }) => {
    const namespace = rootState.namespace
    return getCloudProviderSecrets({ namespace })
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
    const { namespace = rootState.namespace, name } = metadata
    return updateCloudProviderSecret({ namespace, name, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  create: ({ commit, rootState }, { metadata, data }) => {
    const { namespace = rootState.namespace } = metadata
    return createCloudProviderSecret({ namespace, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  delete ({ dispatch, commit, rootState }, name) {
    const namespace = rootState.namespace
    return deleteCloudProviderSecret({ namespace, name })
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
    const index = findIndex(state.all, eqlNameAndNamespace({
      name: newItem.metadata.name,
      namespace: newItem.metadata.namespace
    }))
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, newItem))
    } else {
      state.all.push(newItem)
    }
  },
  ITEM_DELETED (state, deletedItem) {
    const index = findIndex(state.all, eqlNameAndNamespace({
      name: deletedItem.metadata.name,
      namespace: deletedItem.metadata.namespace
    }))
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
