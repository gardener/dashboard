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
import filter from 'lodash/filter'
import findIndex from 'lodash/findIndex'
import assign from 'lodash/assign'
import matches from 'lodash/matches'
import forEach from 'lodash/forEach'
import matchesProperty from 'lodash/matchesProperty'
import get from 'lodash/get'

const eqlNameAndNamespace = ({namespace, name}) => {
  return matches({ metadata: { namespace, name } })
}

const eqIssue = issue => {
  return matches({ metadata: { number: issue.metadata.number } })
}

// initial state
const state = {
  all: [],
  allComments: {}
}

// getters
const getters = {
  items: state => state.all,
  issues: (state) => ({name, namespace}) => {
    return filter(state.all, eqlNameAndNamespace({name, namespace}))
  },
  comments: (state) => ({issueNumber}) => {
    return state.allComments[issueNumber]
  }
}

// actions
const actions = {
  getCommentsList ({ commit, rootState }, {name, namespace}) {
    return state.comments
  }
}

// mutations
const mutations = {
  ITEM_PUT (state, newItem) {
    putItem(state, newItem)
  },
  ITEMS_PUT (state, newItems) {
    forEach(newItems, newItem => putItem(state, newItem))
  },
  ITEM_DEL (state, deletedItem) {
    const index = findIndex(state.all, eqIssue(deletedItem))
    if (index !== -1) {
      state.all.splice(index, 1)
    }
  },
  COMMENT_PUT (state, newItem) {
    putComment(state, newItem)
  },
  COMMENTS_PUT (state, newItems) {
    forEach(newItems, newItem => putComment(state, newItem))
  },
  COMMENT_DEL (state, deletedItem) {
    const issueNumber = get(deletedItem, 'metadata.number')

    // eslint-disable-next-line
    const index = findIndex(commentForIssue(state, issueNumber), matchesProperty('metadata.id', deletedItem.metadata.id))
    if (index !== -1) {
      state.allComments[issueNumber].splice(index, 1)
    }
  },
  CLEAR_COMMENTS (state) {
    state.allComments = {}
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

const putToList = (list, newItem, updatedAtKeyPath, matcher) => {
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
