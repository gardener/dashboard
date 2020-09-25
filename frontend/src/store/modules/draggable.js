//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// initial state
const state = {
  draggingDragAndDropId: undefined
}

// getters
const getters = {
  draggingDragAndDropId: state => state.draggingDragAndDropId
}

// actions
const actions = {
  setDraggingDragAndDropId: ({ commit, rootState }, draggingDragAndDropId) => {
    commit('SET_DRAGGING_DRAG_AND_DROP_ID', draggingDragAndDropId)
    return state.draggingDragAndDropId
  }
}

// mutations
const mutations = {
  SET_DRAGGING_DRAG_AND_DROP_ID (state, draggingDragAndDropId) {
    state.draggingDragAndDropId = draggingDragAndDropId
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
