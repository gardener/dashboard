//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const EventEmitter = require('events')
const _ = require('lodash')
const logger = require('../logger')

function init () {
  const issues = {}
  const commentsForIssues = {} // we could also think of getting rid of the comments cache
  const emitter = new EventEmitter()

  function onIssue (fn) {
    logger.debug('listening on issues cache changes')
    emitter.on('issue', fn)
  }

  function onComment (fn) {
    logger.debug('listening on comments cache changes')
    emitter.on('comment', fn)
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
    return _.values(issues)
  }

  function getCommentsForIssue ({ issueNumber }) {
    return _.values(getCommentsForIssueCache({ issueNumber }))
  }

  function getIssue (number) {
    return issues[number]
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
    if (!commentsForIssues[issueNumber]) {
      commentsForIssues[issueNumber] = {}
    }
    return commentsForIssues[issueNumber]
  }

  function addOrUpdateIssues ({ issues }) {
    _.forEach(issues, issue => addOrUpdateIssue({ issue }))
  }

  function addOrUpdateIssue ({ issue }) {
    updateIfNewer('issue', issues, issue, 'number')
  }

  function addOrUpdateComment ({ issueNumber, comment }) {
    const comments = getCommentsForIssueCache({ issueNumber })
    updateIfNewer('comment', comments, comment, 'id')
  }

  function removeIssue ({ issue }) {
    const issueNumber = issue.metadata.number
    logger.trace('removing issue', issueNumber, 'and comments')

    const comments = getCommentsForIssueCache({ issueNumber })

    _.unset(issues, issueNumber)
    _.unset(commentsForIssues, issueNumber)

    emitIssueDeleted(issue)
    _.forEach(comments, emitCommmentDeleted)
  }

  function removeComment ({ issueNumber, comment }) {
    const identifier = comment.metadata.id
    logger.trace('removing comment', identifier, 'of issue', issueNumber)
    const commentsForIssuesCache = getCommentsForIssueCache({ issueNumber })
    _.unset(commentsForIssuesCache, identifier)
    emitCommmentDeleted(comment)
  }

  function updateIfNewer (kind, cachedList, item, itemIdentifier) {
    const identifier = item.metadata[itemIdentifier]
    const cachedItem = cachedList[identifier]
    if (cachedItem) {
      if (isCachedItemOlder(cachedItem, item)) {
        if (!_.isEqual(cachedItem, item)) {
          logger.trace('updating', kind, identifier)
          cachedList[identifier] = item
          emitModified(kind, item)
        }
      } else {
        logger.warn(`skipped updating ${kind} with id ${identifier} as it was older`)
      }
    } else {
      logger.trace('adding new', kind, identifier)
      cachedList[identifier] = item
      emitAdded(kind, item)
    }
    return item
  }

  function isCachedItemOlder (cachedItem, item) {
    return new Date(item.metadata.updated_at) >= new Date(cachedItem.metadata.updated_at)
  }

  return {
    emitter,
    onIssue,
    onComment,
    getIssue,
    getIssues,
    getCommentsForIssue,
    getIssueNumbers,
    getIssueNumbersForNameAndProjectName,
    addOrUpdateIssues,
    addOrUpdateIssue,
    addOrUpdateComment,
    removeIssue,
    removeComment
  }
}

module.exports = init
