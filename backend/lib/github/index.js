//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const octokit = require('./octokit')()

const config = require('../config')
const {
  org: owner,
  repository: repo
} = config.gitHub || {}

function searchIssues ({ state, title } = {}) {
  const q = [
    `repo:${owner}/${repo}`
  ]
  if (state) {
    q.push(`state:${state}`)
  }
  if (title) {
    q.push(`${title} in:title`)
  }
  return octokit.createPageStream(octokit.search.issues, {
    path_to_items: 'items',
    q: q.join(' ')
  })
}

function closeIssue ({ number }) {
  return octokit.issues.edit({
    owner,
    repo,
    number,
    state: 'closed'
  })
}

function getComments ({ number }) {
  return octokit.createPageStream(octokit.issues.getComments, {
    owner,
    repo,
    number
  })
}

function createComment ({ number }, body) {
  return octokit.issues.createComment({
    owner,
    repo,
    number,
    body
  })
}

module.exports = {
  searchIssues,
  closeIssue,
  getComments,
  createComment
}
