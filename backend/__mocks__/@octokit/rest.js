//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { filter, startsWith, endsWith, chain } = require('lodash')
const createError = require('http-errors')
const graphql = require('graphql')
const fixtures = require('../../__fixtures__')
const octokitRest = jest.requireActual('@octokit/rest')

function getIssueNumber (query) {
  return Number(graphql.parse(query)
    .definitions
    .find(({ name }) => name.value === 'paginate')
    .selectionSet.selections
    .find(({ name }) => name.value === 'repository')
    .selectionSet.selections
    .find(({ name }) => name.value === 'issue')
    .arguments
    .find(({ name }) => name.value === 'number')
    .value.value)
}

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
  octokit.graphql.paginate = jest.fn().mockImplementation(async query => {
    const number = getIssueNumber(query)
    const comments = await getIssueComments(number)
    const nodes = comments.map(comment => {
      return {
        databaseId: comment.id,
        url: comment.html_url,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        body: comment.body,
        author: {
          login: comment.user.login,
          avatarUrl: comment.user.avatar_url
        }
      }
    })
    return {
      repository: {
        issue: {
          comments: {
            nodes
          }
        }
      }
    }
  })
  octokit.issues.get = jest.fn().mockRejectedValue(serviceUnavailable)
  octokit.issues.update = jest.fn().mockRejectedValue(serviceUnavailable)
  octokit.issues.createComment = jest.fn().mockRejectedValue(serviceUnavailable)
  return octokit
})
Octokit.plugin = jest.fn().mockReturnValue(Octokit)

module.exports = {
  Octokit,
  mockListIssues,
  mockListComments
}
