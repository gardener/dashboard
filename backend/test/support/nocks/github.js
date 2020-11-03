//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const nock = require('nock')

const { createTicketCache } = require('../common')

const webhookSecret = toHex('webhookSecret')
const url = 'https://api.github.com'
const owner = 'gardener'
const repo = 'ticket-dev'
const auth = {
  token: toHex('token')
}

function toHex (secret) {
  return Buffer.from(secret, 'utf8').toString('hex')
}

function formatTime (time) {
  return new Date(time).toISOString().replace(/\.\d+Z/, 'Z')
}

/* eslint camelcase: 0 */
function createGithubIssue ({
  number,
  title = 'title',
  namespace = 'garden-test',
  name = 'test',
  body,
  comments = 0,
  state = 'open',
  created_at,
  updated_at
}) {
  const issueId = 327883526 + number
  title = `[${namespace}/${name}] ${title}`
  body = body || `This is bug #${number}`
  const time = (1530562712 + number * 60) * 1000
  created_at = created_at || formatTime(time)
  updated_at = updated_at || formatTime(time)
  return {
    id: issueId,
    title,
    comments,
    created_at,
    updated_at,
    body,
    number,
    state,
    html_url: `https://github.com/gardener/ticket-dev/issues/${number}`,
    user: {
      id: 21031061,
      avatar_url: 'https://avatars1.githubusercontent.com/u/21031061?v=4',
      login: 'johndoe'
    },
    labels: [{
      id: 949737505,
      name: 'bug',
      color: 'd73a4a'
    }]
  }
}

function createGithubComment ({
  id,
  number,
  namespace = 'garden-test',
  name = 'test',
  body,
  created_at,
  updated_at
}) {
  body = body || `This is comment ${id} for issue #${number} `
  const time = (1530563012 + number * 60) * 1000
  created_at = created_at || formatTime(time)
  updated_at = updated_at || formatTime(time)
  return {
    id,
    created_at,
    updated_at,
    body,
    number,
    html_url: `https://github.com/gardener/ticket-dev/issues/${number}#issuecomment-${id}`,
    user: {
      id: 21031061,
      avatar_url: 'https://avatars1.githubusercontent.com/u/21031061?v=4',
      login: 'johndoe'
    }
  }
}

function authorizationHeader (token) {
  const authorization = `token ${token}`
  return {authorization}
}

function nockWithAuthorization (token) {
  const reqheaders = authorizationHeader(token || auth.token)
  return nock(url, {reqheaders})
}

const githubIssueList = [
  createGithubIssue({number: 1}),
  createGithubIssue({number: 2, body: 'The second bug', comments: 1}),
  createGithubIssue({number: 3, namespace: 'garden-foobar'}),
  createGithubIssue({number: 4, state: 'closed', comments: 1})
]

const githubIssueCommentsList = [
  createGithubComment({id: 1, number: 4}),
  createGithubComment({id: 2, number: 2})
]

const stub = {
  getIssues ({name, namespace, state = 'open'} = {}) {
    const q = [
      `repo:${owner}/${repo}`
    ]
    if (state) {
      q.push(`state:${state}`)
    }
    if (name && namespace) {
      q.push(`[${namespace}/${name}] in:title`)
    }
    const items = _.filter(githubIssueList, issue => {
      if (state && state !== issue.state) {
        return false
      }
      if (name && namespace && _.startsWith(issue.title, `[${namespace}/${name}]`)) {
        return false
      }
      return true
    })
    return nockWithAuthorization(auth.token)
      .get('/search/issues')
      .query({q: q.join(' ')})
      .reply(200, {
        total_count: items.length,
        incomplete_results: false,
        items
      })
  },
  getComments ({number}) {
    const comments = _.filter(githubIssueCommentsList, ['number', number])
    return nockWithAuthorization(auth.token)
      .get(`/repos/${owner}/${repo}/issues/${number}/comments`)
      .reply(200, comments)
  }
}
module.exports = {
  url,
  auth,
  webhookSecret,
  formatTime,
  createTicketCache,
  createGithubIssue,
  createGithubComment,
  githubIssueList,
  githubIssueCommentsList,
  stub
}
