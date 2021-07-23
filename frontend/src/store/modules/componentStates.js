//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const state = {
  manageDns: {}
}

// mutations
const mutations = {
  SET_MANAGE_DNS (state, data) {
    state.manageDns = data
  }
}

export default {
  namespaced: true,
  state,
  mutations
}
