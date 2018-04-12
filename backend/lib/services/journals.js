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

const github = require('../github')
const _ = require('lodash')
const { getJournalCache } = require('../cache')

function fromLabel (item) {
  const label = _.assign(
    _.pick(item, [
      'id',
      'name',
      'color'
    ]))
  return label
}

function fromIssue (issue) {
  const journal = { kind: 'issue' }
  const title = _.get(issue, 'title', '')
  const labels = _.map(_.get(issue, 'labels', []), fromLabel)

  const [, namespace, name, journalTitle] = /^\[([a-z0-9-]+)\/([a-z0-9-]+)\](.*)$/.exec(title) || []
  journal.metadata = _.assign(
    _.pick(issue, [
      'id',
      'created_at',
      'updated_at',
      'number'
    ]), {
      namespace,
      name
    })
  journal.data = _.assign(
    _.pick(issue, [
      'user.login',
      'user.avatar_url',
      'html_url',
      'body',
      'comments'
    ]), {
      labels,
      journalTitle
    })

  return journal
}
exports.fromIssue = fromIssue

function fromComment (issueNumber, name, namespace, item) {
  const comment = { kind: 'comment' }
  comment.metadata = _.assign(
    _.pick(item, [
      'id',
      'created_at',
      'updated_at'
    ]), {
      number: issueNumber,
      name,
      namespace
    })
  comment.data = _.pick(item, [
    'user.login',
    'user.avatar_url',
    'body',
    'html_url'
  ])

  return comment
}
exports.fromComment = fromComment

exports.list = async function ({name, namespace, batchFn = data => {}}) {
  return github.searchIssues({
    name,
    namespace,
    batchFn: (data) => {
      const items = _.get(data, 'items', [])
      const journals = _.map(items, fromIssue)

      getJournalCache().addOrUpdateIssues({issues: journals})
      batchFn(items)
    }})
}

const commentsForNameAndNamespace = async function ({name, namespace, batchFn = data => {}}) {
  const issueNumbers = getJournalCache().getIssueNumbersForNameAndNamespace({name, namespace})
  const readCommentsPromises = _.map(issueNumbers, issueNumber => commentsForIssueNumber({issueNumber, name, namespace, batchFn}))

  await Promise.all(readCommentsPromises)
}
exports.commentsForNameAndNamespace = commentsForNameAndNamespace

const commentsForIssueNumber = async function ({issueNumber, name, namespace, batchFn = comments => {}}) {
  return github.comments({issueNumber,
    batchFn: data => {
      const commentsBatch = _.map(data, (item) => fromComment(issueNumber, name, namespace, item))
      batchFn(commentsBatch)
    }})
}
