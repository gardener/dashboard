//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import assign from 'lodash/assign'
import filter from 'lodash/filter'
import findIndex from 'lodash/findIndex'
import forEach from 'lodash/forEach'
import get from 'lodash/get'
import head from 'lodash/head'
import flatMap from 'lodash/flatMap'
import matches from 'lodash/matches'
import matchesProperty from 'lodash/matchesProperty'
import orderBy from 'lodash/orderBy'
import unionBy from 'lodash/unionBy'

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
  allComments: {}
}

const getOpenIssues = ({ state, name, projectName }) => {
  return filter(state.all, eql({ name, projectName, state: 'open' }))
}
// getters
const getters = {
  items: state => state.all,
  issues: (state) => ({ name, projectName }) => {
    return getOpenIssues({ state, name, projectName })
  },
  comments: (state) => ({ issueNumber }) => {
    return state.allComments[issueNumber]
  },
  latestUpdated: (state) => ({ name, projectName }) => {
    const latestUpdatedIssue = head(getOpenIssues({ state, name, projectName }))
    return get(latestUpdatedIssue, 'metadata.updated_at')
  },
  labels: (state) => ({ name, projectName }) => {
    const issues = getOpenIssues({ state, name, projectName })
    const labels = unionBy(flatMap(issues, issue => get(issue, 'data.labels')), 'id')
    return labels
  }
}

// actions
const actions = {
  getCommentsList ({ commit, rootState }, { name, projectName }) {
    return state.comments
  },
  clearIssues ({ commit, dispatch }) {
    commit('CLEAR_ISSUES')
    return state.all
  },
  clearComments ({ commit, dispatch }) {
    commit('CLEAR_COMMENTS')
    return state.comments
  }
}

const orderTicketsByUpdatedAt = () => {
  state.all = orderBy(state.all, ['metadata.updated_at'], ['desc'])
}
// mutations
const mutations = {
  HANDLE_ISSUE_EVENTS (state, events) {
    forEach(events, event => {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          putItem(state, event.object)
          break
        case 'DELETED':
          deleteItem(state, event.object)
          break
        default:
          console.error('undhandled event type', event.type)
      }
    })
    orderTicketsByUpdatedAt()
  },
  HANDLE_COMMENTS_EVENTS (state, events) {
    forEach(events, event => {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          putComment(state, event.object)
          break
        case 'DELETED':
          deleteComment(state, event.object)
          break
        default:
          console.error('undhandled event type', event.type)
      }
    })
    orderTicketsByUpdatedAt()
  },
  CLEAR_ISSUES (state) {
    state.all = []
  },
  CLEAR_COMMENTS (state) {
    state.allComments = {}
  }
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
  const matcher = matches({ metadata: { id: newItem.metadata.id } })
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
  mutations
}
