//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'

import { useLogger } from '@/composables/useLogger'

import {
  assign,
  findIndex,
  get,
  head,
  matches,
  matchesProperty,
  groupBy,
  orderBy,
  uniqBy,
} from '@/lodash'

const eqIssue = issue => {
  return matches({ metadata: { number: issue.metadata.number } })
}

const orderByUpdatedAt = items => {
  return orderBy(items, ['metadata.updated_at'], ['desc'])
}

const orderTicketsByUpdatedAt = issueList => {
  issueList.value = orderByUpdatedAt(issueList.value)
}

const deleteItem = (issueList, deletedItem) => {
  const index = findIndex(issueList.value, eqIssue(deletedItem))
  if (index !== -1) {
    issueList.value.splice(index, 1)
  }
}

const putItem = (issueList, newItem) => {
  putToList(issueList.value, newItem, 'metadata.updated_at', eqIssue(newItem))
}

const deleteComment = (issueComments, deletedItem) => {
  const issueNumber = get(deletedItem, 'metadata.number')

  // eslint-disable-next-line
  const index = findIndex(commentForIssue(state, issueNumber), matchesProperty('metadata.id', deletedItem.metadata.id))
  if (index !== -1) {
    issueComments.value[issueNumber].splice(index, 1)
  }
}

const commentForIssue = (issueComments, issueNumber) => {
  if (!issueComments.value[issueNumber]) {
    issueComments.value[issueNumber] = []
  }
  return issueComments.value[issueNumber]
}

const putComment = (issueComments, newItem) => {
  const issueNumber = get(newItem, 'metadata.number')
  const commentsList = commentForIssue(issueComments, issueNumber)
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

function issueKey (projectName, name) {
  return projectName + '/' + name
}

export const useTicketStore = defineStore('ticket', () => {
  const logger = useLogger()

  const issueList = ref([])
  const issueComments = ref({})

  const items = computed(() => {
    return issueList.value
  })

  const issuesMap = computed(() => {
    const data = {}
    if (Array.isArray(issueList.value)) {
      for (const item of issueList.value) {
        const { projectName, name, state } = item.metadata
        if (state === 'open') {
          const key = issueKey(projectName, name)
          if (Array.isArray(data[key])) {
            data[key].push(item)
          } else {
            data[key] = [item]
          }
        }
      }
    }
    return data
  })

  const labelsMap = computed(() => {
    const data = {}
    for (const [key, items] of Object.entries(issuesMap.value)) {
      for (const item of items) {
        const uniqLabels = data[key] ?? []
        const labels = item.data?.labels ?? []
        data[key] = uniqBy([
          ...uniqLabels,
          ...labels,
        ], 'id')
      }
    }
    return data
  })

  function issues ({ name, projectName }) {
    const key = issueKey(projectName, name)
    return issuesMap.value[key]
  }

  function comments ({ issueNumber }) {
    return issueComments.value[issueNumber]
  }

  function latestUpdated ({ name, projectName }) {
    return head(issues({ name, projectName }))
  }

  function labels ({ name, projectName }) {
    const key = issueKey(projectName, name)
    return labelsMap.value[key] ?? []
  }

  function receiveIssues (issues) {
    issueList.value = orderByUpdatedAt(issues)
  }

  function receiveComments (comments) {
    issueComments.value = groupBy(comments, 'metadata.number')
  }

  function handleIssuesEvent ({ type, object }) {
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        putItem(issueList, object)
        break
      case 'DELETED':
        deleteItem(issueList, object)
        break
      default:
        logger.error('undhandled event type', type)
    }
    orderTicketsByUpdatedAt(issueList)
  }

  function handleCommentsEvent ({ type, object }) {
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        putComment(issueComments, object)
        break
      case 'DELETED':
        deleteComment(issueComments, object)
        break
      default:
        logger.error('undhandled event type', type)
    }
    orderTicketsByUpdatedAt(issueList)
  }

  function clearIssues () {
    issueList.value = []
  }

  function clearComments () {
    issueComments.value = {}
  }

  return {
    items,
    issues,
    comments,
    latestUpdated,
    labels,
    receiveIssues,
    receiveComments,
    handleIssuesEvent,
    handleCommentsEvent,
    clearIssues,
    clearComments,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTicketStore, import.meta.hot))
}
