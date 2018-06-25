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
const { journals } = require('../../services')
const { getJournalCache } = require('../../cache')
const logger = require('../../logger')

exports.processIssue = async function ({action, issue}) {
  issue = journals.fromIssue(issue)

  if (action === 'closed') {
    getJournalCache().removeIssue({issue})
  } else {
    getJournalCache().addOrUpdateIssue({issue})

    const hasComments = _.get(issue, 'data.comments', 0) > 0
    if (action === 'reopened' && hasComments) {
      const issueNumber = _.get(issue, 'metadata.number')
      const batchFn = comments => {
        logger.debug('fetched %s comments (batch) for issue %s', comments.length, issueNumber)
        _.forEach(comments, comment => getJournalCache().addOrUpdateComment({issueNumber, comment}))
      }
      try {
        await journals.commentsForIssueNumber({
          issueNumber,
          name: _.get(issue, 'metadata.name'),
          namespace: _.get(issue, 'metadata.namespace'),
          batchFn
        })
      } catch (error) {
        logger.error('failed to fetch comments for reopened issue %s: %s', issueNumber, error)
      }
    }
  }
}

const processComment = ({action, issue, comment}) => {
  issue = journals.fromIssue(issue)
  const issueNumber = _.get(issue, 'metadata.number')
  const name = _.get(issue, 'metadata.name')
  const namespace = _.get(issue, 'metadata.namespace')
  comment = journals.fromComment(issueNumber, name, namespace, comment)

  if (action === 'deleted') {
    getJournalCache().removeComment({issueNumber, comment})
  } else {
    getJournalCache().addOrUpdateComment({issueNumber, comment})
  }
}
exports.processComment = processComment
