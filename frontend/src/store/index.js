//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import { gravatarUrlGeneric, displayName, fullDisplayName, getDateFormatted, addKymaAddon } from '@/utils'
import reduce from 'lodash/reduce'
import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import filter from 'lodash/filter'
import uniq from 'lodash/uniq'
import get from 'lodash/get'
import includes from 'lodash/includes'
import some from 'lodash/some'
import concat from 'lodash/concat'
import merge from 'lodash/merge'
import difference from 'lodash/difference'
import forEach from 'lodash/forEach'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import head from 'lodash/head'
import pick from 'lodash/pick'
import sortBy from 'lodash/sortBy'
import lowerCase from 'lodash/lowerCase'
import cloneDeep from 'lodash/cloneDeep'
import max from 'lodash/max'
import moment from 'moment-timezone'

import shoots from './modules/shoots'
import cloudProfiles from './modules/cloudProfiles'
import domains from './modules/domains'
import projects from './modules/projects'
import members from './modules/members'
import infrastructureSecrets from './modules/infrastructureSecrets'
import journals from './modules/journals'
import semver from 'semver'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'

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
  user: null,
  redirectPath: null,
  loading: false,
  alert: null,
  alertBanner: null,
  shootsLoading: false,
  websocketConnectionError: null,
  localTimezone: moment.tz.guess(),
  conditionCache: {
    APIServerAvailable: {
      displayName: 'API Server',
      shortName: 'API',
      description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.'
    },
    ControlPlaneHealthy: {
      displayName: 'Control Plane',
      shortName: 'CP',
      description: 'Indicates whether all control plane components are up and running.',
      showAdminOnly: true
    },
    EveryNodeReady: {
      displayName: 'Nodes',
      shortName: 'N',
      description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.'
    },
    SystemComponentsHealthy: {
      displayName: 'System Components',
      shortName: 'SC',
      description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.'
    }
  }
}

const getFilterValue = (state) => {
  return state.namespace === '_all' && state.onlyShootsWithIssues ? 'issues' : null
}

const vendorNameFromImageName = imageName => {
  const lowerCaseName = lowerCase(imageName)
  if (lowerCaseName.includes('coreos')) {
    return 'coreos'
  } else if (lowerCaseName.includes('ubuntu')) {
    return 'ubuntu'
  } else if (lowerCaseName.includes('suse') && lowerCaseName.includes('jeos')) {
    return 'suse-jeos'
  }
  return undefined
}

const iconForVendor = vendorName => {
  if (!vendorName) {
    return 'mdi-blur-radial'
  }
  return vendorName
}

const vendorNeedsLicense = vendorName => {
  return vendorName === 'suse-jeos'
}

// getters
const getters = {
  apiServerUrl (state) {
    return get(state.cfg, 'apiServerUrl', window.location.origin)
  },
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
      const filteredCloudProfiles = filter(state.cloudProfiles.all, predicate)
      return sortBy(filteredCloudProfiles, 'metadata.name')
    }
  },
  machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    const machineAndVolumeTypePredicate = unavailableItems => {
      return item => {
        if (item.usable === false) {
          return false
        }
        if (includes(unavailableItems, item.name)) {
          return false
        }
        return true
      }
    }

    return ({ type, cloudProfileName, region, zones }) => {
      if (!cloudProfileName) {
        return []
      }
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const items = cloudProfile.data[type]
      if (!region || !zones) {
        return items
      }
      const regionObject = find(cloudProfile.data.regions, { name: region })
      let regionZones = get(regionObject, 'zones', [])
      regionZones = filter(regionZones, regionZone => includes(zones, regionZone.name))
      const unavailableItems = flatMap(regionZones, zone => {
        if (type === 'machineTypes') {
          return zone.unavailableMachineTypes
        } else if (type === 'volumeTypes') {
          return zone.unavailableVolumeTypes
        }
      })
      return filter(items, machineAndVolumeTypePredicate(unavailableItems))
    }
  },
  machineTypesByCloudProfileName (state, getters) {
    return ({ cloudProfileName }) => {
      return getters.machineTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName })
    }
  },
  machineTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    return ({ cloudProfileName, region, zones }) => {
      return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({ type: 'machineTypes', cloudProfileName, region, zones })
    }
  },
  volumeTypesByCloudProfileName (state, getters) {
    return ({ cloudProfileName }) => {
      return getters.volumeTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName })
    }
  },
  volumeTypesByCloudProfileNameAndRegionAndZones (state, getters) {
    return ({ cloudProfileName, region, zones }) => {
      return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({ type: 'volumeTypes', cloudProfileName, region, zones })
    }
  },
  machineImagesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const machineImages = get(cloudProfile, 'data.machineImages')

      const mapMachineImages = (machineImage) => {
        const versions = filter(machineImage.versions, ({ version, expirationDate }) => {
          if (expirationDate && moment().isAfter(expirationDate)) {
            return false
          }
          if (!semver.valid(version)) {
            console.error(`Skipped machine image ${machineImage.name} as version ${version} is not a valid semver version`)
            return false
          }
          return true
        })
        versions.sort((a, b) => {
          return semver.rcompare(a.version, b.version)
        })

        return map(versions, ({ version, expirationDate }) => {
          const vendorName = vendorNameFromImageName(machineImage.name)
          return {
            name: machineImage.name,
            version,
            expirationDate,
            expirationDateString: getDateFormatted(expirationDate),
            vendorName,
            icon: iconForVendor(vendorName),
            needsLicense: vendorNeedsLicense(vendorName)
          }
        })
      }

      return flatMap(machineImages, mapMachineImages)
    }
  },
  zonesByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        return map(get(find(cloudProfile.data.regions, { 'name': region }), 'zones'), 'name')
      }
      return []
    }
  },
  defaultMachineImageForCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const machineImages = getters.machineImagesByCloudProfileName(cloudProfileName)
      const defaultMachineImage = head(machineImages)
      return pick(defaultMachineImage, 'name', 'version')
    }
  },
  shootList (state, getters) {
    return getters['shoots/sortedItems']
  },
  selectedShoot (state, getters) {
    return getters['shoots/selectedItem']
  },
  projectList (state) {
    return state.projects.all
  },
  memberList (state, getters) {
    return state.members.all
  },
  infrastructureSecretList (state) {
    return state.infrastructureSecrets.all
  },
  getInfrastructureSecretByName (state, getters) {
    return ({ namespace, name }) => {
      return getters['infrastructureSecrets/getInfrastructureSecretByName']({ namespace, name })
    }
  },
  namespaces (state) {
    return map(state.projects.all, 'metadata.namespace')
  },
  cloudProviderKindList (state) {
    return uniq(map(state.cloudProfiles.all, 'metadata.cloudProviderKind'))
  },
  sortedCloudProviderKindList (state, getters) {
    return intersection(['aws', 'azure', 'gcp', 'openstack', 'alicloud', 'vsphere'], getters.cloudProviderKindList)
  },
  regionsWithSeedByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return uniq(map(get(cloudProfile, 'data.seeds'), 'data.region'))
    }
  },
  minimumVolumeSizeByCloudProfileNameAndRegion (state, getters) {
    return ({ cloudProfileName, region }) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const seedsForCloudProfile = cloudProfile.data.seeds
      const seedsMatchingCloudProfileAndRegion = find(seedsForCloudProfile, { data: { region } })
      return max(map(seedsMatchingCloudProfileAndRegion, 'volume.minimumSize')) || '20Gi'
    }
  },
  regionsWithoutSeedByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      if (cloudProfile) {
        const regionsInCloudProfile = map(cloudProfile.data.regions, 'name')
        const regionsWithoutSeed = difference(regionsInCloudProfile, getters.regionsWithSeedByCloudProfileName(cloudProfileName))
        return regionsWithoutSeed
      }
      return []
    }
  },
  loadBalancerProviderNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return uniq(map(get(cloudProfile, 'data.providerConfig.constraints.loadBalancerProviders'), 'name'))
    }
  },
  loadBalancerClassNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const loadBalancerClasses = getters.loadBalancerClassesByCloudProfileName(cloudProfileName)
      return uniq(map(loadBalancerClasses, 'name'))
    }
  },
  loadBalancerClassesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return get(cloudProfile, 'data.providerConfig.constraints.loadBalancerConfig.classes')
    }
  },
  floatingPoolNamesByCloudProfileName (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      return uniq(map(get(cloudProfile, 'data.providerConfig.constraints.floatingPools'), 'name'))
    }
  },
  infrastructureSecretsByInfrastructureKind (state) {
    return (infrastructureKind) => {
      return filter(state.infrastructureSecrets.all, ['metadata.cloudProviderKind', infrastructureKind])
    }
  },
  infrastructureSecretsByCloudProfileName (state) {
    return (cloudProfileName) => {
      return filter(state.infrastructureSecrets.all, ['metadata.cloudProfileName', cloudProfileName])
    }
  },
  shootByNamespaceAndName (state, getters) {
    return ({ namespace, name }) => {
      return getters['shoots/itemByNameAndNamespace']({ namespace, name })
    }
  },
  journalsByNamespaceAndName (state, getters) {
    return ({ namespace, name }) => {
      return getters['journals/issues']({ namespace, name })
    }
  },
  journalCommentsByIssueNumber (state, getters) {
    return ({ issueNumber }) => {
      return getters['journals/comments']({ issueNumber })
    }
  },
  lastUpdatedJournalByNameAndNamespace (state, getters) {
    return ({ namespace, name }) => {
      return getters['journals/lastUpdated']({ namespace, name })
    }
  },
  journalsLabels (state, getters) {
    return ({ namespace, name }) => {
      return getters['journals/labels']({ namespace, name })
    }
  },
  kubernetesVersions (state, getters) {
    return (cloudProfileName) => {
      const cloudProfile = getters.cloudProfileByName(cloudProfileName)
      const allVersions = get(cloudProfile, 'data.kubernetes.versions', [])
      const validVersions = filter(allVersions, ({ expirationDate, version }) => {
        if (!semver.valid(version)) {
          console.error(`Skipped Kubernetes version ${version} as it is not a valid semver version`)
          return false
        }
        if (expirationDate && moment().isAfter(expirationDate)) {
          return false
        }
        return true
      })
      return map(validVersions, version => {
        return {
          ...version,
          expirationDateString: getDateFormatted(version.expirationDate)
        }
      })
    }
  },
  sortedKubernetesVersions (state, getters) {
    return (cloudProfileName) => {
      const kubernetsVersions = cloneDeep(getters.kubernetesVersions(cloudProfileName))
      kubernetsVersions.sort((a, b) => {
        return semver.rcompare(a.version, b.version)
      })
      return kubernetsVersions
    }
  },
  isAdmin (state) {
    return get(state.user, 'isAdmin', false)
  },
  canCreateProject (state) {
    return get(state.user, 'canCreateProject', false)
  },
  journalList (state) {
    return state.journals.all
  },
  username (state) {
    const user = state.user
    return user ? user.email || user.id : ''
  },
  userExpiresAt (state) {
    const user = state.user
    return user ? user.exp * 1000 : 0
  },
  avatarUrl (state, getters) {
    return gravatarUrlGeneric(getters.username)
  },
  displayName (state) {
    const user = state.user
    return user ? user.name || displayName(user.id) : ''
  },
  fullDisplayName (state) {
    const user = state.user
    return user ? user.name || fullDisplayName(user.id) : ''
  },
  alertMessage (state) {
    return get(state, 'alert.message', '')
  },
  alertType (state) {
    return get(state, 'alert.type', 'error')
  },
  alertBannerMessage (state) {
    return get(state, 'alertBanner.message', '')
  },
  alertBannerType (state) {
    return get(state, 'alertBanner.type', 'error')
  },
  currentNamespaces (state, getters) {
    if (state.namespace === '_all') {
      return getters.namespaces
    }
    if (state.namespace) {
      return [state.namespace]
    }
    return []
  },
  isCurrentNamespace (state, getters) {
    return namespace => includes(getters.currentNamespaces, namespace)
  },
  isWebsocketConnectionError (state) {
    return get(state, 'websocketConnectionError') !== null
  },
  websocketConnectAttempt (state) {
    return get(state, 'websocketConnectionError.reconnectAttempt')
  },
  getShootListFilters (state, getters) {
    return getters['shoots/getShootListFilters']
  },
  newShootResource (state, getters) {
    return getters['shoots/newShootResource']
  },
  initialNewShootResource (state, getters) {
    return getters['shoots/initialNewShootResource']
  },
  hasGardenTerminalAccess (state, getters) {
    return getters.isTerminalEnabled && getters.isAdmin
  },
  hasControlPlaneTerminalAccess (state, getters) {
    return getters.isTerminalEnabled && getters.isAdmin
  },
  hasShootTerminalAccess (state, getters) {
    return getters.isTerminalEnabled
  },
  isTerminalEnabled (state, getters) {
    return get(state, 'cfg.features.terminalEnabled', false)
  },
  isKymaFeatureEnabled (state, getters) {
    return get(state, 'cfg.features.kymaEnabled', false)
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
  clearIssues ({ dispatch, commit }) {
    return dispatch('journals/clearIssues')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  clearComments ({ dispatch, commit }) {
    return dispatch('journals/clearComments')
      .catch(err => {
        dispatch('setError', err)
      })
  },
  subscribeShoot ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/clearAll')
      .then(() => EmitterWrapper.shootEmitter.subscribeShoot({ name, namespace }))
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
  getShootAddonKyma ({ dispatch, commit }, { name, namespace }) {
    return dispatch('shoots/getAddonKyma', { name, namespace })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  subscribeShoots ({ dispatch, commit, state }) {
    return EmitterWrapper.shootsEmitter.subscribeShoots({ namespace: state.namespace, filter: getFilterValue(state) })
  },
  subscribeComments ({ dispatch, commit }, { name, namespace }) {
    return new Promise((resolve, reject) => {
      EmitterWrapper.journalCommentsEmitter.subscribeComments({ name, namespace })
      resolve()
    })
  },
  unsubscribeComments ({ dispatch, commit }) {
    return new Promise((resolve, reject) => {
      EmitterWrapper.journalCommentsEmitter.unsubscribe()
      resolve()
    })
  },
  setSelectedShoot ({ dispatch }, metadata) {
    return dispatch('shoots/setSelection', metadata)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListSortParams ({ dispatch }, pagination) {
    return dispatch('shoots/setListSortParams', pagination)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListFilters ({ dispatch, commit }, value) {
    return dispatch('shoots/setShootListFilters', value)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListFilter ({ dispatch, commit }, { filter, value }) {
    return dispatch('shoots/setShootListFilter', { filter, value })
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setShootListSearchValue ({ dispatch }, searchValue) {
    return dispatch('shoots/setListSearchValue', searchValue)
      .catch(err => {
        dispatch('setError', err)
      })
  },
  setNewShootResource ({ dispatch }, data) {
    return dispatch('shoots/setNewShootResource', data)
  },
  resetNewShootResource ({ dispatch }) {
    return dispatch('shoots/resetNewShootResource')
  },
  createProject ({ dispatch, commit }, data) {
    return dispatch('projects/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Project created', type: 'success' })
        return res
      })
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
  createInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/create', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret created', type: 'success' })
        return res
      })
  },
  updateInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/update', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret updated', type: 'success' })
        return res
      })
  },
  deleteInfrastructureSecret ({ dispatch, commit }, data) {
    return dispatch('infrastructureSecrets/delete', data)
      .then(res => {
        dispatch('setAlert', { message: 'Infractructure secret deleted', type: 'success' })
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
  addMember ({ dispatch, commit }, name) {
    return dispatch('members/add', name)
      .then(res => {
        dispatch('setAlert', { message: 'Member added', type: 'success' })
        return res
      })
  },
  deleteMember ({ dispatch, commit }, name) {
    return dispatch('members/delete', name)
      .then(res => {
        dispatch('setAlert', { message: 'Member deleted', type: 'success' })
        return res
      })
      .catch(err => {
        dispatch('setError', { message: `Delete member failed. ${err.message}` })
      })
  },
  setConfiguration ({ commit, getters }, value) {
    commit('SET_CONFIGURATION', value)

    if (getters.isKymaFeatureEnabled) {
      addKymaAddon(value.kyma)
    }

    if (get(value, 'alert')) {
      commit('SET_ALERT_BANNER', get(value, 'alert'))
    }

    forEach(value.knownConditions, (conditionValue, conditionKey) => {
      commit('setCondition', { conditionKey, conditionValue })
    })

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
    commit('SET_USER', value)
    return state.user
  },
  unsetUser ({ dispatch, commit }) {
    commit('SET_USER', null)
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
    const currentNamespace = !some(namespaces, namespace => !getters.isCurrentNamespace(namespace))
    if (currentNamespace) {
      commit('SET_SHOOTS_LOADING', false)
    }
    return state.shootsLoading
  },
  setWebsocketConnectionError ({ commit }, { reason, reconnectAttempt }) {
    commit('SET_WEBSOCKETCONNECTIONERROR', { reason, reconnectAttempt })
    return state.websocketConnectionError
  },
  unsetWebsocketConnectionError ({ commit }) {
    commit('SET_WEBSOCKETCONNECTIONERROR', null)
    return state.websocketConnectionError
  },
  setError ({ commit }, value) {
    commit('SET_ALERT', { message: get(value, 'message', ''), type: 'error' })
    return state.alert
  },
  setAlert ({ commit }, value) {
    commit('SET_ALERT', value)
    return state.alert
  },
  setAlertBanner ({ commit }, value) {
    commit('SET_ALERT_BANNER', value)
    return state.alertBanner
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
      // no need to subscribe for shoots here as this is done in the router on demand (as not all routes require the shoots to be loaded)
    }
  },
  SET_ONLYSHOOTSWITHISSUES (state, value) {
    state.onlyShootsWithIssues = value
    // subscribe again for shoots as the filter has changed
    EmitterWrapper.shootsEmitter.subscribeShoots({ namespace: state.namespace, filter: getFilterValue(state) })
  },
  SET_USER (state, value) {
    state.user = value
    if (value) {
      EmitterWrapper.connect()
    } else {
      EmitterWrapper.disconnect()
    }
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
  SET_WEBSOCKETCONNECTIONERROR (state, value) {
    if (value) {
      state.websocketConnectionError = merge({}, state.websocketConnectionError, value)
    } else {
      state.websocketConnectionError = null
    }
  },
  SET_ALERT (state, value) {
    state.alert = value
  },
  SET_ALERT_BANNER (state, value) {
    state.alertBanner = value
  },
  setCondition (state, { conditionKey, conditionValue }) {
    Vue.set(state.conditionCache, conditionKey, conditionValue)
  }
}

const modules = {
  projects,
  members,
  cloudProfiles,
  domains,
  shoots,
  infrastructureSecrets,
  journals
}

const store = new Vuex.Store({
  state,
  actions,
  getters,
  mutations,
  modules,
  strict: debug,
  plugins
})

const { shootsEmitter, shootEmitter, journalIssuesEmitter, journalCommentsEmitter } = EmitterWrapper

/* Shoots */
function filterNamespacedEvents (namespacedEvents) {
  const concatEventsForNamespace = (accumulator, namespace) => concat(accumulator, namespacedEvents[namespace] || [])
  return reduce(store.getters.currentNamespaces, concatEventsForNamespace, [])
}
shootsEmitter.on('shoots', namespacedEvents => {
  store.commit('shoots/HANDLE_EVENTS', {
    rootState: state,
    events: filterNamespacedEvents(namespacedEvents)
  })
})
shootEmitter.on('shoot', namespacedEvents => {
  store.commit('shoots/HANDLE_EVENTS', {
    rootState: state,
    events: filterNamespacedEvents(namespacedEvents)
  })
})

/* Journal Issues */
journalIssuesEmitter.on('issues', events => {
  store.commit('journals/HANDLE_ISSUE_EVENTS', events)
})

/* Journal Comments */
journalCommentsEmitter.on('comments', events => {
  store.commit('journals/HANDLE_COMMENTS_EVENTS', events)
})

export default store

export {
  state,
  actions,
  getters,
  mutations,
  modules,
  plugins
}
