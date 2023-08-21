//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { filter, startsWith, endsWith, chain } = require('lodash')
const createError = require('http-errors')
const fixtures = require('../../__fixtures__')
const octokitRest = jest.requireActual('@octokit/rest')

const serviceUnavailable = createError(503)

const mockListIssues = jest.fn().mockReturnValue(fixtures.github.issues.list())
const mockListComments = jest.fn().mockReturnValue(fixtures.github.comments.list())

function searchIssues (q) {
  const tokens = chain(q)
    .split(/ +/)
    .compact()
    .reverse()
    .value()
  let state
  let title
  let isTitle = false
  for (const token of tokens) {
    if (isTitle) {
      isTitle = false
      title = token
    } else if (token === 'in:title') {
      isTitle = true
    } else if (startsWith(token, 'state:')) {
      state = token.substring(6)
    }
  }
  const issueList = mockListIssues()
  const items = filter(issueList, issue => {
    if (state && state !== issue.state) {
      return false
    }
    if (title && startsWith(issue.title, title)) {
      return false
    }
    return true
  })
  return Promise.resolve(items)
}

function getIssueComments (number) {
  const commentList = mockListComments()
  const comments = filter(commentList, ['number', number])
  return Promise.resolve(comments)
}

const Octokit = jest.fn().mockImplementation(options => {
  const octokit = new octokitRest.Octokit(options)
  octokit.paginate = jest.fn().mockImplementation(options => {
    const { url, q, issue_number: number } = options
    if (endsWith(url, '/issues') && q) {
      return searchIssues(q)
    }
    if (endsWith(url, '/comments') && number) {
      return getIssueComments(number)
    }
    throw createError(404)
  })
  octokit.issues.get = jest.fn().mockRejectedValue(serviceUnavailable)
  octokit.issues.update = jest.fn().mockRejectedValue(serviceUnavailable)
  octokit.issues.createComment = jest.fn().mockRejectedValue(serviceUnavailable)
  return octokit
})

module.exports = {
  Octokit,
  mockListIssues,
  mockListComments
}
