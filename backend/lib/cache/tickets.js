//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import EventEmitter from 'events'
import _ from 'lodash-es'
import logger from '../logger/index.js'

function init () {
  const issues = new Map()
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
    return _
      .chain(getIssues())
      .filter(_.matches({ metadata: { name, projectName } }))
      .map('metadata.number')
      .value()
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

  function addOrUpdateIssue ({ issue }) {
    updateIfNewer('issue', issues, issue)
  }

  function addOrUpdateComment ({ issueNumber, comment }) {
    const comments = getCommentsForIssueCache({ issueNumber })
    updateIfNewer('comment', comments, comment)
  }

  function removeIssue ({ issue }) {
    const issueNumber = issue.metadata.number
    logger.trace('removing issue', issueNumber, 'and comments')

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

  function updateIfNewer (kind, cachedMap, item) {
    const identifier = kind === 'issue'
      ? item.metadata.number
      : item.metadata.id
    const cachedItem = cachedMap.get(identifier)
    if (cachedItem) {
      if (isCachedItemOlder(cachedItem, item)) {
        if (!_.isEqual(cachedItem, item)) {
          logger.trace('updating', kind, identifier)
          cachedMap.set(identifier, item)
          emitModified(kind, item)
        }
      } else {
        logger.warn(`skipped updating ${kind} with id ${identifier} as it was older`)
      }
    } else {
      logger.trace('adding new', kind, identifier)
      cachedMap.set(identifier, item)
      emitAdded(kind, item)
    }
    return item
  }

  function isCachedItemOlder (cachedItem, item) {
    return new Date(item.metadata.updated_at) >= new Date(cachedItem.metadata.updated_at)
  }

  return {
    emitter,
    on,
    getIssue,
    getIssues,
    getCommentsForIssue,
    getIssueNumbers,
    getIssueNumbersForNameAndProjectName,
    addOrUpdateIssues,
    addOrUpdateIssue,
    addOrUpdateComment,
    removeIssue,
    removeComment,
  }
}

export default init
