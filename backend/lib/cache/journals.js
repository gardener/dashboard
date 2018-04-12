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

const _ = require('lodash')
const logger = require('../logger')

const issues = {}
const commentsForIssues = {} // we could also think of getting rid of the comments cache
const issueHandlers = []
const commentHandlers = []

const subscribeIssues = function (fn) {
  logger.debug('subscribing to issues cache')
  issueHandlers.push(fn)
}

const subscribeComments = function (fn) {
  logger.debug('subscribing to comments cache')
  commentHandlers.push(fn)
}

const fireIssue = function (type, object) {
  _.forEach(issueHandlers, handler => handler({kind: 'issue', type, object}))
}

const fireCommment = function (type, object) {
  _.forEach(commentHandlers, handler => handler({kind: 'comment', type, object}))
}

const getIssues = function () {
  return _.values(issues)
}

const getIssueNumbersForNameAndNamespace = function ({name, namespace}) {
  return _.map(_.filter(getIssues(), _.matches({metadata: {name, namespace}})), issue => issue.metadata.number)
}

const getCommentsForIssue = function ({issueNumber}) {
  return commentsForIssues[issueNumber]
}

const addOrUpdateIssues = function ({issues}) {
  _.forEach(issues, issue => addOrUpdateIssue({issue}))
}

const addOrUpdateIssue = function ({issue}) {
  updateIfNewer(fireIssue, 'issue', issues, issue, 'number')
}

const addOrUpdateComment = function ({issueNumber, comment}) {
  updateIfNewer(fireCommment, 'comment', getCommentsForIssueCache(issueNumber), comment, 'id')
}

const getCommentsForIssueCache = function ({issueNumber}) {
  if (!commentsForIssues[issueNumber]) {
    commentsForIssues[issueNumber] = {}
  }
  return commentsForIssues[issueNumber]
}

const removeIssue = function ({issue}) {
  const issueNumber = _.get(issue, 'metadata.number')
  logger.debug('removing issue', issueNumber, 'and comments')

  const comments = getCommentsForIssue({issueNumber})

  _.unset(issues, issueNumber)
  _.unset(commentsForIssues, issueNumber)

  fireIssue('DELETED', issue)
  _.forEach(comments, comment => fireCommment('DELETED', comment))
}

const removeComment = function ({issueNumber, comment}) {
  const identifier = _.get(comment, 'metadata.id')
  logger.debug('removing comment', identifier, 'of issue', issueNumber)
  _.unset(getCommentsForIssueCache(issueNumber), identifier)
  fireCommment('DELETED', comment)
}

const updateIfNewer = function (fire, type, cachedList, item, itemIdentifier) {
  const identifier = _.get(item, ['metadata', itemIdentifier])

  const cachedItem = _.get(cachedList, identifier)
  if (cachedItem) {
    if (isCachedItemOlder(cachedItem, item)) {
      logger.debug('updating', type, identifier)
      cachedList[identifier] = item
      fire('MODIFIED', item)
    } else {
      logger.warn(`skipped updating ${type} with id ${identifier} as it was older`)
    }
  } else {
    logger.debug('adding new', type, identifier)
    cachedList[identifier] = item
    fire('ADDED', item)
  }
  return item
}

const isCachedItemOlder = function (cachedItem, item) {
  return new Date(item.metadata.updated_at) >= new Date(cachedItem.metadata.updated_at)
}

module.exports = {
  subscribeIssues,
  subscribeComments,
  getIssues,
  getIssueNumbersForNameAndNamespace,
  addOrUpdateIssues,
  addOrUpdateIssue,
  addOrUpdateComment,
  removeIssue,
  removeComment
}
