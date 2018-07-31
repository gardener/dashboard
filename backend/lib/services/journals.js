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

'use strict'

const _ = require('lodash')
const logger = require('../logger')
const github = require('../github')
const { getJournalCache } = require('../cache')

function fromLabel (item) {
  return _.pick(item, [
    'id',
    'name',
    'color'
  ])
}

function fromIssue (issue) {
  const labels = _.map(issue.labels, fromLabel)
  const [, namespace, name, journalTitle] = /^\[([a-z0-9-]+)\/([a-z0-9-]+)\]\s*(.*)$/.exec(issue.title || '') || []
  return {
    kind: 'issue',
    metadata: _
      .chain(issue)
      .pick([
        'id',
        'created_at',
        'updated_at',
        'number',
        'state'
      ])
      .assign({
        namespace,
        name
      })
      .value(),
    data: _
      .chain(issue)
      .pick([
        'user.login',
        'user.avatar_url',
        'html_url',
        'body',
        'comments'
      ])
      .assign({
        labels,
        journalTitle
      })
      .value()
  }
}
exports.fromIssue = fromIssue

function fromComment (number, name, namespace, item) {
  return {
    kind: 'comment',
    metadata: _
      .chain(item)
      .pick([
        'id',
        'created_at',
        'updated_at'
      ])
      .assign({
        number,
        name,
        namespace
      })
      .value(),
    data: _.pick(item, [
      'user.login',
      'user.avatar_url',
      'body',
      'html_url'
    ])
  }
}
exports.fromComment = fromComment

function getOpenIssues ({name, namespace} = {}) {
  let title
  if (name && namespace) {
    title = `[${namespace}/${name}]`
  }
  return github
    .searchIssues({state: 'open', title})
    .thru(githubIssues => _.map(githubIssues, fromIssue))
}
exports.getOpenIssues = getOpenIssues

function loadOpenIssues (...args) {
  return getOpenIssues(...args)
    .reduce((cache, issues) => {
      cache.addOrUpdateIssues({issues})
      return cache
    }, getJournalCache())
    .then(() => undefined)
}
exports.loadOpenIssues = exports.list = loadOpenIssues

function finalizeIssue (number) {
  return Promise.resolve()
    .then(() => github.createComment({number}, '_[Auto-closed due to Shoot deletion]_'))
    .then(() => github.closeIssue({number}))
}

function deleteJournals ({name, namespace}) {
  const cache = getJournalCache()
  const numbers = cache.getIssueNumbersForNameAndNamespace({name, namespace})
  if (_.isEmpty(numbers)) {
    return Promise.resolve()
  }
  logger.debug('deleting journal for shoot %s/%s. Affected issue numbers: %s', namespace, name, numbers)
  return Promise.all(_.map(numbers, finalizeIssue))
}
exports.deleteJournals = deleteJournals

function getIssueComments ({number}) {
  const cache = getJournalCache()
  const {metadata: {name, namespace}} = cache.getIssue(number)
  return github
    .getComments({number})
    .thru(githubComments => _.map(githubComments, comment => fromComment(number, name, namespace, comment)))
}
exports.getIssueComments = getIssueComments

function loadIssueComments ({number}) {
  return getIssueComments({number})
    .reduce((cache, comments) => {
      _.forEach(comments, comment => cache.addOrUpdateComment({issueNumber: number, comment}))
      return cache
    }, getJournalCache())
    .then(() => undefined)
}
exports.loadIssueComments = loadIssueComments
