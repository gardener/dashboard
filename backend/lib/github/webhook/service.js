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

exports.processIssue = function ({action, issue}) {
  issue = journals.fromIssue(issue)

  if (action === 'closed') {
    getJournalCache().removeIssue({issue})
  } else {
    getJournalCache().addOrUpdateIssue({issue})
  }
}

const processComment = function ({action, issue, comment}) {
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
