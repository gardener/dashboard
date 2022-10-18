//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getGardenerExtensions } from '@/utils/api'

import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import filter from 'lodash/filter'
import some from 'lodash/some'
import get from 'lodash/get'
import find from 'lodash/find'

// initial state
const state = {
  all: []
}

// getters
const getters = {
  items (state) {
    return state.all
  },
  networkingTypes (state) {
    const resources = flatMap(state.all, 'resources')
    const networkingResources = filter(resources, ['kind', 'Network'])
    return map(networkingResources, 'type')
  },
  sortedDnsProviderList (state) {
    const supportedProviderTypes = ['aws-route53', 'azure-dns', 'azure-private-dns', 'google-clouddns', 'openstack-designate', 'alicloud-dns', 'infoblox-dns', 'netlify-dns']
    const resources = flatMap(state.all, 'resources')
    const dnsProvidersFromDnsRecords = filter(resources, ['kind', 'DNSRecord'])

    const dnsProviderList = map(supportedProviderTypes, type => {
      return {
        type,
        primary: get(find(dnsProvidersFromDnsRecords, { type }), 'primary', false)
      }
    })

    const dnsServiceExtensionDeployed = some(state.all, ['name', 'extension-shoot-dns-service'])
    if (dnsServiceExtensionDeployed) {
      return dnsProviderList
    }
    // return only primary DNS Providers backed by DNSRecord
    return filter(dnsProviderList, 'primary')
  }
}

// actions
const actions = {
  async getAll ({ commit, state }) {
    const { data } = await getGardenerExtensions()
    commit('RECEIVE', data)
    return state.all
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
