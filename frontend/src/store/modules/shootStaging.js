//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

import has from 'lodash/has'
import get from 'lodash/get'
import set from 'lodash/set'
import head from 'lodash/head'
import map from 'lodash/map'
import keyBy from 'lodash/keyBy'
import omit from 'lodash/omit'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import every from 'lodash/every'

import { v4 as uuidv4 } from '@/utils/uuid'

// helper
function getId (object) {
  return get(object, 'id', null)
}

function isDnsProviderValid ({ type, secretName }) {
  return !!type && !!secretName
}

function notYetCreated (object) {
  return !get(object, 'metadata.creationTimestamp')
}

// state
const state = {
  metadata: {},
  dnsDomain: null,
  dnsProviders: {},
  dnsProviderIds: [],
  dnsPrimaryProviderId: null,
  dnsPrimaryProviderValid: null
}

// getters
const getters = {
  clusterIsNew (state) {
    return notYetCreated(state)
  },
  dnsProviderTypes (state, getters, rootState, rootGetters) {
    return map(rootGetters.sortedDnsProviderList, 'type')
  },
  dnsProviderTypesWithPrimarySupport (state, getters, rootState, rootGetters) {
    return map(filter(rootGetters.sortedDnsProviderList, 'primary'), 'type')
  },
  dnsProviders (state) {
    return map(state.dnsProviderIds, id => state.dnsProviders[id])
  },
  dnsProvidersWithPrimarySupport (state, getters) {
    const types = getters.dnsProviderTypesWithPrimarySupport
    return filter(getters.dnsProviders, ({ type }) => includes(types, type))
  },
  dnsProvidersValid (state) {
    return every(state.dnsProviders, 'valid')
  },
  dnsPrimaryProvider (state) {
    return state.dnsProviders[state.dnsPrimaryProviderId]
  },
  dnsDefaultPrimaryProviderId (state, getters) {
    const defaultPrimaryProvider = head(getters.dnsProvidersWithPrimarySupport)
    return getId(defaultPrimaryProvider)
  },
  getDnsConfiguration (state) {
    const providerById = id => {
      const {
        type,
        secretName,
        excludeDomains,
        includeDomains,
        excludeZones,
        includeZones
      } = state.dnsProviders[id]
      const primary = state.dnsPrimaryProviderId === id
      const provider = {
        type,
        secretName,
        primary
      }
      if (!isEmpty(excludeDomains)) {
        set(provider, 'domains.exclude', [...excludeDomains])
      }
      if (!isEmpty(includeDomains)) {
        set(provider, 'domains.include', [...includeDomains])
      }
      if (!isEmpty(excludeZones)) {
        set(provider, 'zones.exclude', [...excludeZones])
      }
      if (!isEmpty(includeZones)) {
        set(provider, 'zones.include', [...includeZones])
      }
      return provider
    }
    return () => {
      const dns = {
        providers: map(state.dnsProviderIds, providerById)
      }
      const domain = state.dnsDomain
      if (domain && domain.length) {
        dns.domain = domain
      }
      return dns
    }
  },
  dnsConfigurationValid (state, getters) {
    return state.dnsPrimaryProviderValid && getters.dnsProvidersValid
  }
}

// actions
const actions = {
  setDnsDomain ({ commit, state, getters }, value) {
    commit('setDnsDomain', value)
    if (!value) {
      commit('setDnsPrimaryProviderId', null)
    } else if (!state.dnsPrimaryProviderId) {
      const id = getters.dnsDefaultPrimaryProviderId
      if (id) {
        commit('setDnsPrimaryProviderId', id)
      }
    }
  },
  addDnsProvider ({ commit, getters, rootGetters }) {
    const type = head(getters.dnsProviderTypes)
    const dnsSecret = head(rootGetters.dnsSecretsByProviderKind(type))
    const secretName = get(dnsSecret, 'metadata.name')
    const id = uuidv4()
    commit('addDnsProvider', {
      id,
      type,
      secretName,
      excludeDomains: [],
      includeDomains: [],
      excludeZones: [],
      includeZones: [],
      valid: isDnsProviderValid({ type, secretName })
    })
  },
  setClusterConfiguration ({ commit }, value) {
    const {
      metadata = {},
      spec: {
        dns = {}
      }
    } = value
    // metadata
    commit('setMetadata', metadata)
    // dns configuration
    let primaryProviderId = null
    const domain = dns.domain
    const providers = map(dns.providers, provider => {
      const id = uuidv4()
      const {
        type,
        secretName,
        primary = false,
        domains: {
          exclude: excludeDomains = [],
          include: includeDomains = []
        } = {},
        zones: {
          exclude: excludeZones = [],
          include: includeZones = []
        } = {}
      } = provider
      if (primary) {
        primaryProviderId = id
      }
      return {
        id,
        type,
        secretName,
        excludeDomains: [...excludeDomains],
        includeDomains: [...includeDomains],
        excludeZones: [...excludeZones],
        includeZones: [...includeZones],
        valid: isDnsProviderValid({ type, secretName })
      }
    })
    commit('setDns', {
      domain,
      providers,
      primaryProviderId
    })
  }
}

// mutations
const mutations = {
  setMetadata (state, metadata) {
    state.metadata = metadata
  },
  setDns (state, { domain, providers = [], primaryProviderId = null }) {
    state.dnsDomain = domain
    state.dnsProviders = keyBy(providers, 'id')
    state.dnsProviderIds = map(providers, 'id')
    state.dnsPrimaryProviderId = primaryProviderId
    state.dnsPrimaryProviderValid = true
  },
  setDnsDomain (state, value) {
    state.dnsDomain = value
  },
  setDnsPrimaryProviderId (state, value) {
    state.dnsPrimaryProviderId = value
  },
  setDnsPrimaryProvider (state, value) {
    state.dnsPrimaryProviderId = getId(value)
  },
  setDnsPrimaryProviderValid (state, value) {
    state.dnsPrimaryProviderValid = value
  },
  addDnsProvider (state, value) {
    const id = getId(value)
    const index = state.dnsProviderIds.indexOf(id)
    if (index === -1) {
      state.dnsProviderIds.push(id)
      Vue.set(state.dnsProviders, id, value)
    }
  },
  patchDnsProvider (state, value) {
    const id = getId(value)
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1 && has(state.dnsProviders, id)) {
      const object = omit(value, ['id'])
      for (const [key, value] of Object.entries(object)) {
        Vue.set(state.dnsProviders[id], key, value)
      }
    }
  },
  deleteDnsProvider (state, id) {
    const index = state.dnsProviderIds.indexOf(id)
    if (index !== -1) {
      state.dnsProviderIds.splice(index, 1)
    }
    Vue.delete(state.dnsProviders, id)
    if (isEmpty(state.dnsProviderIds)) {
      state.dnsDomain = null
      state.dnsPrimaryProviderId = null
      state.dnsPrimaryProviderValid = true
    } else if (state.dnsPrimaryProviderId === id) {
      state.dnsPrimaryProviderId = null
      state.dnsPrimaryProviderValid = !state.dnsDomain
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
