//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import EventEmitter from 'events'
import _ from 'lodash-es'
import logger from '../logger/index.js'

function shootKey (projectName, name) {
  return JSON.stringify([projectName, name])
}

function init () {
  const issues = new Map()
  const issuesByShoot = new Map() // Map<shootKey, Map<issueNumber, issue>>
  const commentsForIssues = new Map() // we could also think of getting rid of the comments cache
  const emitter = new EventEmitter()

  function on (eventName, listener) {
    emitter.on(eventName, listener)
  }

  function emit (kind, type, object) {
    emitter.emit(kind, { kind, type, object })
  }

  function emitAdded (kind, object) {
    emit(kind, 'ADDED', object)
  }

  function emitModified (kind, object) {
    emit(kind, 'MODIFIED', object)
  }

  function emitIssueDeleted (object) {
    emit('issue', 'DELETED', object)
  }

  function emitCommmentDeleted (object) {
    emit('comment', 'DELETED', object)
  }

  function getIssues () {
    return Array.from(issues.values())
  }

  function getCommentsForIssue ({ issueNumber }) {
    const comments = getCommentsForIssueCache({ issueNumber })
    return Array.from(comments.values())
  }

  function getIssue (number) {
    return issues.get(number)
  }

  function getIssueNumbers () {
    return _.map(getIssues(), 'metadata.number')
  }

  function getIssueNumbersForNameAndProjectName ({ name, projectName }) {
    const map = issuesByShoot.get(shootKey(projectName, name))
    if (!map) {
      return []
    }
    return Array.from(map.keys())
  }

  function getIssuesForShoot ({ name, projectName }) {
    const map = issuesByShoot.get(shootKey(projectName, name))
    if (!map) {
      return []
    }
    return Array.from(map.values())
  }

  function getCommentsForIssueCache ({ issueNumber }) {
    if (!commentsForIssues.has(issueNumber)) {
      commentsForIssues.set(issueNumber, new Map())
    }
    return commentsForIssues.get(issueNumber)
  }

  function addOrUpdateIssues ({ issues }) {
    for (const issue of issues) {
      addOrUpdateIssue({ issue })
    }
  }

  function addOrUpdateIssue ({ issue, mapFn }) {
    const number = issue.number
    const oldIssue = issues.get(number)
    if (oldIssue) {
      removeFromShootIndex(oldIssue)
    }
    const updated = updateIfNewer('issue', issues, issue, mapFn)
    // Re-read from issues map — updateIfNewer may have kept the old item if it was newer
    addToShootIndex(issues.get(number))

    return updated
  }

  function addOrUpdateComment ({ issueNumber, comment }) {
    const comments = getCommentsForIssueCache({ issueNumber })
    updateIfNewer('comment', comments, comment)
  }

  function removeIssue ({ issue }) {
    const issueNumber = issue.metadata.number
    logger.trace('removing issue', issueNumber, 'and comments')

    const cachedIssue = issues.get(issueNumber)
    if (cachedIssue) {
      removeFromShootIndex(cachedIssue)
    }

    const comments = getCommentsForIssueCache({ issueNumber })

    issues.delete(issueNumber)
    commentsForIssues.delete(issueNumber)

    emitIssueDeleted(issue)
    for (const comment of comments.values()) {
      emitCommmentDeleted(comment)
    }
  }

  function removeComment ({ issueNumber, comment }) {
    const identifier = comment.metadata.id
    logger.trace('removing comment', identifier, 'of issue', issueNumber)
    const commentsForIssuesCache = getCommentsForIssueCache({ issueNumber })
    commentsForIssuesCache.delete(identifier)
    emitCommmentDeleted(comment)
  }

  function addToShootIndex (issue) {
    const { projectName, name, number } = issue?.metadata ?? {}
    if (!projectName || !name) {
      return
    }
    const key = shootKey(projectName, name)
    let map = issuesByShoot.get(key)
    if (!map) {
      map = new Map()
      issuesByShoot.set(key, map)
    }
    map.set(number, issue)
  }

  function removeFromShootIndex (issue) {
    const { projectName, name, number } = issue?.metadata ?? {}
    if (!projectName || !name) {
      return
    }
    const key = shootKey(projectName, name)
    const map = issuesByShoot.get(key)
    if (!map) {
      return
    }
    map.delete(number)
    if (map.size === 0) {
      issuesByShoot.delete(key)
    }
  }

  function updateIfNewer (kind, cachedMap, item, mapFn) {
    let updated = false
    const identifier = kind === 'issue'
      ? item.number
      : item.metadata.id
    const cachedItem = cachedMap.get(identifier)
    if (cachedItem) {
      if (isCachedItemOlder(kind, cachedItem, item)) {
        const updatedItem = mapFn ? mapFn(item) : item
        if (!_.isEqual(cachedItem, updatedItem)) {
          logger.trace('updating', kind, identifier)
          cachedMap.set(identifier, updatedItem)
          updated = true
          emitModified(kind, updatedItem)
        }
      } else {
        logger.debug(`skipped updating ${kind} with id ${identifier} as updated_at has not changed`)
      }
    } else {
      logger.trace('adding new', kind, identifier)
      const updatedItem = mapFn ? mapFn(item) : item
      cachedMap.set(identifier, updatedItem)
      updated = true
      emitAdded(kind, updatedItem)
    }
    return updated
  }

  function isCachedItemOlder (kind, cachedItem, item) {
    const newItemDate = kind === 'issue'
      ? item.updated_at
      : item.metadata.updated_at
    return new Date(newItemDate) > new Date(cachedItem.metadata.updated_at)
  }

  return {
    emitter,
    on,
    getIssue,
    getIssues,
    getCommentsForIssue,
    getIssueNumbers,
    getIssueNumbersForNameAndProjectName,
    getIssuesForShoot,
    addOrUpdateIssues,
    addOrUpdateIssue,
    addOrUpdateComment,
    removeIssue,
    removeComment,
  }
}

export default init
