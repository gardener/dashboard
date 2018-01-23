//
// Copyright 2018 by The Gardener Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'

import Emitter from '@/utils/Emitter'
import map from 'lodash/map'
import filter from 'lodash/filter'
import uniq from 'lodash/uniq'
import get from 'lodash/get'
import find from 'lodash/find'

import shoots from './modules/shoots'
import seeds from './modules/seeds'
import projects from './modules/projects'
import members from './modules/members'
import infrastructureSecrets from './modules/infrastructureSecrets'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

// plugins
const plugins = []
if (debug) {
  plugins.push(createLogger())
}

// initial state
const state = {
  cfg: null,
  ready: false,
  namespace: null,
  sidebar: true,
  title: 'Gardener',
  color: 'green',
  user: null,
  loading: false,
  error: null
}

// getters
const getters = {
  seedList (state) {
    return state.seeds.all
  },
  shootList (state) {
    return state.shoots.all
  },
  selectedShoot (state, getters) {
    return getters['shoots/selectedItem']
  },
  projectList (state) {
    return state.projects.all
  },
  memberList (state) {
    return state.members.all
  },
  infrastructureSecretList (state) {
    return state.infrastructureSecrets.all
  },
  namespaces (state) {
    const iteratee = item => item.metadata.namespace
    return map(state.projects.all, iteratee)
  },
  infrastructureKindList (state) {
    const iteratee = item => item.metadata.infrastructure.kind
    return uniq(map(state.seeds.all, iteratee))
  },
  regionsByInfrastructureKind (state) {
    return (infrastructureKind) => {
      const predicate = item => item.metadata.infrastructure.kind === infrastructureKind
      const iteratee = item => item.metadata.infrastructure.region
      return uniq(map(filter(state.seeds.all, predicate), iteratee))
    }
  },
  infrastructureSecretNamesByInfrastructureKind (state) {
    return (infrastructureKind) => {
      const predicate = item => item.metadata.infrastructure.kind === infrastructureKind
      const iteratee = item => item.metadata.name
      return uniq(map(filter(state.infrastructureSecrets.all, predicate), iteratee))
    }
  },
  infrastructureSecretsByInfrastructureKind (state) {
    return (infrastructureKind) => {
      const predicate = item => item.metadata.infrastructure.kind === infrastructureKind
      return filter(state.infrastructureSecrets.all, predicate)
    }
  },
  volumeTypesByInfrastructureKind (state) {
    return (infrastructureKind) => {
      return get(state.cfg, `cloudProviders.${infrastructureKind}.volumeTypes`)
    }
  },
  machineTypesByInfrastructureKind (state) {
    return (infrastructureKind) => {
      return get(state.cfg, `cloudProviders.${infrastructureKind}.machineTypes`)
    }
  },
  shootByNamespaceAndName (state) {
    return ({namespace, name}) => {
      const predicate = item => item.metadata.name === name && item.metadata.namespace === namespace
      return find(state.shoots.all, predicate)
    }
  },
  shootsByInfrastructureSecret (state) {
    return (secretName) => {
      const predicate = item => item.spec.infrastructure.secret === secretName
      return filter(state.shoots.all, predicate)
    }
  },
  kubernetesVersions (state) {
    return get(state.cfg, 'kubernetesVersions')
  },
  username (state) {
    return get(state, 'user.profile.name')
  },
  hasError () {
    return !!state.error
  },
  errorMessage () {
    return state.error ? state.error.message || '' : ''
  }
}

// actions
const actions = {
  fetchAll ({ dispatch, commit }, resources) {
    const iteratee = (value, key) => dispatch(key, value)
    return Promise
      .all(map(resources, iteratee))
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchSeeds ({ dispatch }) {
    return dispatch('seeds/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
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
  fetchInfrastructureSecrets ({ dispatch, commit }) {
    return dispatch('infrastructureSecrets/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchShoots ({ dispatch, commit }) {
    return dispatch('shoots/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchShoot ({ dispatch, commit }, name) {
    return dispatch('shoots/get', name)
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
  createProject ({ dispatch, commit }, data) {
    return dispatch('projects/create', data)
  },
  updateProject ({ dispatch, commit }, data) {
    return dispatch('projects/update', data)
  },
  deleteProject ({ dispatch, commit }, data) {
    return dispatch('projects/delete', data)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  createInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/create', data)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  updateInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/update', data)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  deleteInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/delete', data)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  createShoot ({ dispatch, commit }, data) {
    return dispatch('shoots/create', data)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  deleteShoot ({ dispatch, commit }, name) {
    return dispatch('shoots/delete', name)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  addMember ({ dispatch, commit }, name) {
    return dispatch('members/add', name)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  deleteMember ({ dispatch, commit }, name) {
    return dispatch('members/delete', name)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setConfiguration ({ commit }, value) {
    commit('SET_CONFIGURATION', value)
    return state.cfg
  },
  setNamespace ({ commit }, value) {
    commit('SET_NAMESPACE', value)
    return state.namespace
  },
  setUser ({ commit }, value) {
    commit('SET_USER', value)
    return state.user
  },
  setSidebar ({ commit }, value) {
    commit('SET_SIDEBAR', value)
    return state.sidebar
  },
  setLoading ({ commit }) {
    commit('SET_LOADING', true)
    return state.loading
  },
  unsetLoading ({ commit }) {
    commit('SET_LOADING', false)
    return state.loading
  },
  setError ({ commit }, value) {
    commit('SET_ERROR', value)
    return state.error
  }
}

// mutations
const mutations = {
  SET_CONFIGURATION (state, value) {
    state.cfg = value
  },
  SET_READY (state, value) {
    state.ready = value
  },
  SET_NAMESPACE (state, value) {
    Emitter.setNamespace(value)
    state.namespace = value
  },
  SET_USER (state, value) {
    Emitter.setUser(value)
    state.user = value
  },
  SET_SIDEBAR (state, value) {
    state.sidebar = value
  },
  SET_LOADING (state, value) {
    state.loading = value
  },
  SET_ERROR (state, value) {
    state.error = value
  }
}

const store = new Vuex.Store({
  state,
  actions,
  getters,
  mutations,
  modules: {
    projects,
    members,
    seeds,
    shoots,
    infrastructureSecrets
  },
  strict: debug,
  plugins
})

Emitter.on('shoot', ({type, object}) => {
  switch (type) {
    case 'put':
      if (object.metadata.namespace === state.namespace) {
        store.commit('shoots/ITEM_PUT', object)
      }
      break
    case 'delete':
      store.commit('shoots/ITEM_DEL', object)
      break
  }
})

export default store
