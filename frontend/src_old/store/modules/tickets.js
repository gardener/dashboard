//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import assign from 'lodash/assign'
import filter from 'lodash/filter'
import findIndex from 'lodash/findIndex'
import get from 'lodash/get'
import head from 'lodash/head'
import flatMap from 'lodash/flatMap'
import matches from 'lodash/matches'
import matchesProperty from 'lodash/matchesProperty'
import groupBy from 'lodash/groupBy'
import orderBy from 'lodash/orderBy'
import uniqBy from 'lodash/uniqBy'

const eql = ({ projectName, name, state = undefined }) => {
  const source = { metadata: { projectName } }
  if (name) {
    source.metadata.name = name
  }
  if (state) {
    source.metadata.state = state
  }
  return matches(source)
}

const eqIssue = issue => {
  return matches({ metadata: { number: issue.metadata.number } })
}

// initial state
const state = {
  all: [],
  allComments: {},
}

const getOpenIssues = ({ state, name, projectName }) => {
  return filter(state.all, eql({ name, projectName, state: 'open' }))
}
// getters
const getters = {
  items (state) {
    return state.all
  },
  issues (state) {
    return ({ name, projectName }) => getOpenIssues({ state, name, projectName })
  },
  comments (state) {
    return ({ issueNumber }) => state.allComments[issueNumber]
  },
  latestUpdated (state, getters) {
    return ({ name, projectName }) => {
      const issues = getters.issues({ name, projectName })
      return head(issues)
    }
  },
  labels (state, getters) {
    return ({ name, projectName }) => {
      const issues = getters.issues({ name, projectName })
      return uniqBy(flatMap(issues, 'data.labels'), 'id')
    }
  },
}

// actions
const actions = {
  clearIssues ({ commit, state }) {
    commit('CLEAR_ISSUES')
    return state.all
  },
  clearComments ({ commit, state }) {
    commit('CLEAR_COMMENTS')
    return state.comments
  },
}

const orderByUpdatedAt = items => {
  return orderBy(items, ['metadata.updated_at'], ['desc'])
}

const orderTicketsByUpdatedAt = state => {
  state.all = orderByUpdatedAt(state.all)
}

// mutations
const mutations = {
  RECEIVE_ISSUES (state, issues) {
    state.all = orderByUpdatedAt(issues)
  },
  RECEIVE_COMMENTS (state, comments) {
    state.allComments = groupBy(comments, 'metadata.number')
  },
  HANDLE_ISSUES_EVENT (state, { type, object }) {
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        putItem(state, object)
        break
      case 'DELETED':
        deleteItem(state, object)
        break
      default:
        console.error('undhandled event type', type)
    }
    orderTicketsByUpdatedAt(state)
  },
  HANDLE_COMMENTS_EVENT (state, { type, object }) {
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        putComment(state, object)
        break
      case 'DELETED':
        deleteComment(state, object)
        break
      default:
        console.error('undhandled event type', type)
    }
    orderTicketsByUpdatedAt(state)
  },
  CLEAR_ISSUES (state) {
    state.all = []
  },
  CLEAR_COMMENTS (state) {
    state.allComments = {}
  },
}

const deleteItem = (state, deletedItem) => {
  const index = findIndex(state.all, eqIssue(deletedItem))
  if (index !== -1) {
    state.all.splice(index, 1)
  }
}

const deleteComment = (state, deletedItem) => {
  const issueNumber = get(deletedItem, 'metadata.number')

  // eslint-disable-next-line
  const index = findIndex(commentForIssue(state, issueNumber), matchesProperty('metadata.id', deletedItem.metadata.id))
  if (index !== -1) {
    state.allComments[issueNumber].splice(index, 1)
  }
}

const putItem = (state, newItem) => {
  putToList(state.all, newItem, 'metadata.updated_at', eqIssue(newItem))
}

const commentForIssue = (state, issueNumber) => {
  if (!state.allComments[issueNumber]) {
    Vue.set(state.allComments, issueNumber, [])
  }
  return state.allComments[issueNumber]
}

const putComment = (state, newItem) => {
  const issueNumber = get(newItem, 'metadata.number')
  const commentsList = commentForIssue(state, issueNumber)
  const matcher = matchesProperty('metadata.id', newItem.metadata.id)
  putToList(commentsList, newItem, 'metadata.updated_at', matcher)
}

const putToList = (list, newItem, updatedAtKeyPath, matcher, descending = true) => {
  const index = findIndex(list, matcher)
  if (index !== -1) {
    const item = list[index]
    if (get(item, updatedAtKeyPath) <= get(newItem, updatedAtKeyPath)) {
      list.splice(index, 1, assign({}, item, newItem))
    }
  } else {
    list.push(newItem)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}
