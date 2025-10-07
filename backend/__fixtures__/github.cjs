//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

/* eslint-disable camelcase */

const { createHmac } = require('crypto')
const { cloneDeep } = require('lodash')
const { formatTime } = require('./helper')
const {
  gitHub: {
    apiUrl,
    org,
    repository,
    authentication,
    webhookSecret,
  },
} = require('./config').default

const server = new URL(apiUrl)
const scheme = server.protocol.replace(/:$/, '')
const authority = server.host
const authorization = `Token ${authentication.bearer}`
const repo = `${org}/${repository}`
const NUMBER_TEXT = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function getIssue ({
  number,
  title = 'title',
  namespace = 'garden-test',
  projectName,
  name = 'test',
  body,
  comments = 0,
  state = 'open',
  created_at,
  updated_at,
}) {
  const issueId = 327883526 + number
  title = `[${projectName ?? namespace}/${name}] ${title}`
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
      login: 'johndoe',
    },
    labels: [{
      id: 949737505,
      name: 'bug',
      color: 'd73a4a',
    }],
  }
}

function getComment ({
  id,
  number,
  body,
  created_at,
  updated_at,
}) {
  body = body || `This is comment ${id} for issue #${number}`
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
      login: 'johndoe',
    },
  }
}

const issueList = [
  getIssue({ number: 1 }),
  getIssue({ number: 2, body: 'The second bug', comments: 1 }),
  getIssue({ number: 3, namespace: 'garden-foobar' }),
  getIssue({ number: 4, state: 'closed', comments: 1 }),
]

const commentList = [
  getComment({ id: 1, number: 4 }),
  getComment({ id: 2, number: 2 }),
]

const issues = {
  create (...args) {
    return getIssue(...args)
  },
  list () {
    return cloneDeep(issueList)
  },
}

const comments = {
  create (...args) {
    return getComment(...args)
  },
  list () {
    return cloneDeep(commentList)
  },
}

function createHubSignature (body, secret = null) {
  const key = secret ?? webhookSecret
  return `sha256=${createHmac('sha256', key).update(body).digest('hex')}`
}

module.exports = {
  server,
  ':scheme': scheme,
  ':authority': authority,
  authorization,
  repo,
  issues,
  comments,
  createIssue (number, projectName, options) {
    const body = `The ${NUMBER_TEXT[number]} bug`
    return getIssue({ number, projectName, body, ...options })
  },
  createComment (id, number) {
    return getComment({ id, number })
  },
  createHubSignature,
}
