//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
    emitter.emit(kind, {kind, type, object})
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

  function getCommentsForIssue ({issueNumber}) {
    return _.values(getCommentsForIssueCache({issueNumber}))
  }

  function getIssue (number) {
    return issues[number]
  }

  function getIssueNumbersForNameAndNamespace ({name, namespace}) {
    return _
      .chain(getIssues())
      .filter(_.matches({metadata: {name, namespace}}))
      .map(issue => issue.metadata.number)
      .value()
  }

  function getCommentsForIssueCache ({issueNumber}) {
    if (!commentsForIssues[issueNumber]) {
      commentsForIssues[issueNumber] = {}
    }
    return commentsForIssues[issueNumber]
  }

  function addOrUpdateIssues ({issues}) {
    _.forEach(issues, issue => addOrUpdateIssue({issue}))
  }

  function addOrUpdateIssue ({issue}) {
    updateIfNewer('issue', issues, issue, 'number')
  }

  function addOrUpdateComment ({issueNumber, comment}) {
    const comments = getCommentsForIssueCache({issueNumber})
    updateIfNewer('comment', comments, comment, 'id')
  }

  function removeIssue ({issue}) {
    const issueNumber = issue.metadata.number
    logger.debug('removing issue', issueNumber, 'and comments')

    const comments = getCommentsForIssueCache({issueNumber})

    _.unset(issues, issueNumber)
    _.unset(commentsForIssues, issueNumber)

    emitIssueDeleted(issue)
    _.forEach(comments, emitCommmentDeleted)
  }

  function removeComment ({issueNumber, comment}) {
    const identifier = comment.metadata.id
    logger.debug('removing comment', identifier, 'of issue', issueNumber)
    const commentsForIssuesCache = getCommentsForIssueCache({issueNumber})
    _.unset(commentsForIssuesCache, identifier)
    emitCommmentDeleted(comment)
  }

  function updateIfNewer (kind, cachedList, item, itemIdentifier) {
    const identifier = item.metadata[itemIdentifier]
    const cachedItem = cachedList[identifier]
    if (cachedItem) {
      if (isCachedItemOlder(cachedItem, item)) {
        logger.debug('updating', kind, identifier)
        cachedList[identifier] = item
        emitModified(kind, item)
      } else {
        logger.warn(`skipped updating ${kind} with id ${identifier} as it was older`)
      }
    } else {
      logger.debug('adding new', kind, identifier)
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
    getIssueNumbersForNameAndNamespace,
    addOrUpdateIssues,
    addOrUpdateIssue,
    addOrUpdateComment,
    removeIssue,
    removeComment
  }
}

module.exports = init
