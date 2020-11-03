//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
  const options = octokit.search.issuesAndPullRequests.endpoint.merge({
    q: q.join(' ')
  })
  return octokit.paginate(options)
}

function getIssue ({ number }) {
  return octokit.issues.get({
    owner,
    repo,
    issue_number: number
  })
}

function closeIssue ({ number }) {
  return octokit.issues.update({
    owner,
    repo,
    issue_number: number,
    state: 'closed'
  })
}

function getComments ({ number }) {
  const options = octokit.issues.listComments.endpoint.merge({
    owner,
    repo,
    issue_number: number
  })
  return octokit.paginate(options)
}

function createComment ({ number }, body) {
  return octokit.issues.createComment({
    owner,
    repo,
    issue_number: number,
    body
  })
}

module.exports = {
  searchIssues,
  closeIssue,
  getIssue,
  getComments,
  createComment
}
