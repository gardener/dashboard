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

import EmitterWrapper from '@/utils/Emitter'
import map from 'lodash/map'
import filter from 'lodash/filter'
import uniq from 'lodash/uniq'
import get from 'lodash/get'
import includes from 'lodash/includes'
import mapKeys from 'lodash/mapKeys'
import some from 'lodash/some'

import shoots from './modules/shoots'
import cloudProfiles from './modules/cloudProfiles'
import domains from './modules/domains'
import projects from './modules/projects'
import members from './modules/members'
import infrastructureSecrets from './modules/infrastructureSecrets'
import journals from './modules/journals'

import { getUserInfo } from '@/utils/api'

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
  onlyShootsWithIssues: true,
  sidebar: true,
  title: 'Gardener',
  color: 'green',
  user: null,
  loading: false,
  error: null,
  shootsLoading: false
}

const getFilterValue = (state) => {
  return state.namespace === '_all' && state.onlyShootsWithIssues ? 'issues' : null
}

// getters
const getters = {
  domainList (state) {
    return state.domains.all
  },
  cloudProfileList (state) {
    return state.cloudProfiles.all
  },
  cloudProfileByName (state, getters) {
    return (name) => {
      return getters['cloudProfiles/cloudProfileByName'](name)
    }
  },
  cloudProfilesByCloudProviderKind (state) {
    return (cloudProviderKind) => {
      const predicate = item => item.metadata.cloudProviderKind === cloudProviderKind
      return filter(state.cloudProfiles.all, predicate)
    }
  },
  machineTypesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.machineTypes')
    }
  },
  volumeTypesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.volumeTypes')
    }
  },
  shootList (state, getters) {
    return getters['shoots/items']
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
  cloudProviderKindList (state) {
    const iteratee = item => item.metadata.cloudProviderKind
    return uniq(map(state.cloudProfiles.all, iteratee))
  },
  regionsByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const iteratee = item => item.data.region
      return uniq(map(get(cloudProfile, 'data.seeds'), iteratee))
    }
  },
  loadBalancerProviderNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const iteratee = item => item.name
      return uniq(map(get(cloudProfile, 'data.loadBalancerProviders'), iteratee))
    }
  },
  floatingPoolNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const iteratee = item => item.name
      return uniq(map(get(cloudProfile, 'data.floatingPools'), iteratee))
    }
  },
  infrastructureSecretsByInfrastructureKind (state) {
    return (infrastructureKind) => {
      const predicate = item => {
        return item.metadata.cloudProviderKind === infrastructureKind
      }
      const filtered = filter(state.infrastructureSecrets.all, predicate)
      return filtered
    }
  },
  infrastructureSecretsByCloudProfileName (state) {
    return (cloudProfileName) => {
      const predicate = item => {
        return item.metadata.cloudProfileName === cloudProfileName
      }
      const filtered = filter(state.infrastructureSecrets.all, predicate)
      return filtered
    }
  },
  shootByNamespaceAndName (state, getters) {
    return ({namespace, name}) => {
      return getters['shoots/itemByNameAndNamespace']({namespace, name})
    }
  },
  journalsByNamespaceAndName (state, getters) {
    return ({namespace, name}) => {
      return getters['journals/issues']({namespace, name})
    }
  },
  journalCommentsByIssueNumber (state, getters) {
    return ({issueNumber}) => {
      return getters['journals/comments']({issueNumber})
    }
  },
  shootsByInfrastructureSecret (state) {
    return (secretName, namespace) => {
      const predicate = item => {
        const secretBindingRef = get(item, 'spec.cloud.secretBindingRef')
        return get(secretBindingRef, 'name') === secretName && get(secretBindingRef, 'namespace') === namespace
      }
      return filter(state.shoots.all, predicate)
    }
  },
  kubernetesVersions (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.kubernetes.versions', [])
    }
  },
  isAdmin (state) {
    return get(state.user, 'info.isAdmin', false)
  },
  journalList (state) {
    return state.journals.all
  },
  username (state) {
    return get(state, 'user.profile.name')
  },
  hasError () {
    return !!state.error
  },
  errorMessage () {
    return get(state, 'error.message', '')
  },
  isCurrentNamespace (state, getters) {
    return (namespace) => {
      return (state.namespace === '_all' && includes(getters.namespaces, namespace)) || namespace === state.namespace
    }
  },
  canLinkToSeedWithName (state, getters) {
    return ({namespace, name}) => {
      /*
      * Soils cannot be linked currently as they have no shoot representation.
      * Currently there is only the secret available.
      * If we are not in the garden namespace we expect a seed to be present
      * TODO refactor once we have an owner ref on the shoot pointing to the seed
      */
      if (getters.isCurrentNamespace('garden')) {
        if (!getters.shootByNamespaceAndName({namespace: 'garden', name})) {
          return false
        }
      }
      return true
    }
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
  fetchCloudProfiles ({ dispatch }) {
    return dispatch('cloudProfiles/getAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchDomains ({ dispatch }) {
    return dispatch('domains/getAll')
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
  clearShoots ({ dispatch, commit }) {
    return dispatch('shoots/clearAll')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  fetchShoot ({ dispatch, commit }, {name, namespace}) {
    return dispatch('shoots/get', {name, namespace})
      .catch(err => {
        dispatch('setError', err)
      })
  },
  subscribeComments ({ dispatch, commit }, {name, namespace}) {
    return new Promise((resolve, reject) => {
      commit('journals/CLEAR_COMMENTS')
      EmitterWrapper.journalsEmitter.subscribeComments({name, namespace})
      resolve()
    })
  },
  unsubscribeComments ({ dispatch, commit }) {
    return new Promise((resolve, reject) => {
      EmitterWrapper.journalsEmitter.unsubscribeComments()
      resolve()
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
  },
  deleteShoot ({ dispatch, commit }, {name, namespace}) {
    return dispatch('shoots/delete', {name, namespace})
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
  setOnlyShootsWithIssues ({ commit }, value) {
    commit('SET_ONLYSHOOTSWITHISSUES', value)
    return state.onlyShootsWithIssues
  },
  setUser ({ dispatch, commit }, value) {
    return getUserInfo({user: value})
      .then(res => {
        value.info = res.data
        commit('SET_USER', value)
      }).catch(err => {
        commit('SET_USER', value)
        dispatch('setError', err)
      }).then(() => {
        return state.user
      })
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
  setShootsLoading ({ commit }) {
    commit('SET_SHOOTS_LOADING', true)
    return state.shootsLoading
  },
  unsetShootsLoading ({ commit, getters }, namespaces) {
    const currentNamespace = some(namespaces, namespace => !getters.isCurrentNamespace(namespace))
    if (currentNamespace) {
      commit('SET_SHOOTS_LOADING', false)
    }
    return state.shootsLoading
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
    if (value !== state.namespace) {
      state.namespace = value
      EmitterWrapper.shootsEmitter.setNamespace(value, getFilterValue(state))
    }
  },
  SET_ONLYSHOOTSWITHISSUES (state, value) {
    state.onlyShootsWithIssues = value
    EmitterWrapper.shootsEmitter.setNamespace(state.namespace, getFilterValue(state))
  },
  SET_USER (state, value) {
    state.user = value
    EmitterWrapper.setUser(value)
  },
  SET_SIDEBAR (state, value) {
    state.sidebar = value
  },
  SET_LOADING (state, value) {
    state.loading = value
  },
  SET_SHOOTS_LOADING (state, value) {
    state.shootsLoading = value
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
    cloudProfiles,
    domains,
    shoots,
    infrastructureSecrets,
    journals
  },
  strict: debug,
  plugins
})

const addListener = ({emitter, eventName, itemKey, mutationMapping = {}, eventHandlerFn = {}}) => {
  emitter.on(eventName, (event) => {
    if (eventHandlerFn[event.type]) {
      eventHandlerFn[event.type](event[itemKey])
    } else if (mutationMapping[event.type]) {
      store.commit(mutationMapping[event.type], event[itemKey])
    } else {
      console.error('unhandled type', event.type)
    }
  })
}

/* Shoots */
addListener({
  emitter: EmitterWrapper.shootsEmitter,
  eventName: 'shoot',
  itemKey: 'object',
  eventHandlerFn: {
    put: object => {
      if (getters.isCurrentNamespace(object.metadata.namespace)) {
        store.commit('shoots/ITEM_PUT', object)
      }
    }
  },
  mutationMapping: {
    delete: 'shoots/ITEM_DEL'
  }
})
addListener({
  emitter: EmitterWrapper.shootsEmitter,
  eventName: 'shoots',
  itemKey: 'data',
  eventHandlerFn: {
    put: data => {
      mapKeys(data, (objects, namespace) => {
        if (getters.isCurrentNamespace(namespace)) {
          store.commit('shoots/ITEMS_PUT', objects)
        }
      })
    }
  }
})

/* Journal Issues */
addListener({
  emitter: EmitterWrapper.journalsEmitter,
  eventName: 'issue',
  itemKey: 'object',
  mutationMapping: {
    put: 'journals/ITEM_PUT',
    delete: 'journals/ITEM_DEL'
  }
})
addListener({
  emitter: EmitterWrapper.journalsEmitter,
  eventName: 'issues',
  itemKey: 'data',
  mutationMapping: {
    put: 'journals/ITEMS_PUT'
  }
})

/* Journal Comments */
addListener({
  emitter: EmitterWrapper.journalsEmitter,
  eventName: 'comment',
  itemKey: 'object',
  mutationMapping: {
    put: 'journals/COMMENT_PUT',
    delete: 'journals/COMMENT_DEL'
  }
})
addListener({
  emitter: EmitterWrapper.journalsEmitter,
  eventName: 'comments',
  itemKey: 'data',
  mutationMapping: {
    put: 'journals/COMMENTS_PUT'
  }
})

export default store
