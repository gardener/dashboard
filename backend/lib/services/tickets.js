//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import config from '../config/index.js'
import {
  searchIssues,
  getComments,
} from '../github/index.js'
import { createConverter } from '../markdown.js'
import getCache from '../cache/index.js'

const cache = getCache() // TODO Currently in KCP there is no separation between workspacs

function fromLabel (item) {
  return _.pick(item, [
    'id',
    'name',
    'color',
  ])
}

const apiUrl = _.get(config, ['gitHub', 'apiUrl'])
const options = {}

if (apiUrl) {
  options.ghMentions = true
  options.ghMentionsLink = new URL(apiUrl).origin + '/{u}'
}

export const converter = createConverter(options)

export function fromIssue (issue) {
  const labels = _.map(issue.labels, fromLabel)
  const [, projectName, name, ticketTitle] = /^\[([a-z0-9-]+)\/([a-z0-9-]+)\]\s*(.*)$/.exec(issue.title || '') || []
  return {
    kind: 'issue',
    metadata: _
      .chain(issue)
      .pick([
        'id',
        'created_at',
        'updated_at',
        'number',
        'state',
      ])
      .assign({
        projectName,
        name,
      })
      .value(),
    data: _
      .chain(issue)
      .pick([
        'user.login',
        'user.avatar_url',
        'html_url',
        'comments',
      ])
      .assign({
        body: converter.makeSanitizedHtml(issue.body),
        labels,
        ticketTitle,
      })
      .value(),
  }
}

export function fromComment (number, name, projectName, item) {
  const metadata = _
    .chain(item)
    .pick([
      'id',
      'created_at',
      'updated_at',
    ])
    .assign({
      number,
      name,
      projectName,
    })
    .value()
  const data = _
    .chain(item)
    .pick([
      'user.login',
      'user.avatar_url',
      'html_url',
    ])
    .assign({
      body: converter.makeSanitizedHtml(item.body),
    })
    .value()
  return {
    kind: 'comment',
    metadata,
    data,
  }
}

export async function getOpenIssues ({ name, projectName } = {}) {
  let title
  if (name && projectName) {
    title = `[${projectName}/${name}]`
  }
  const githubIssues = await searchIssues({ state: 'open', title })
  return _.map(githubIssues, fromIssue)
}

export async function loadOpenIssues (...args) {
  const issues = await getOpenIssues(...args)
  const ticketCache = cache.getTicketCache()
  for (const issue of issues) {
    ticketCache.addOrUpdateIssue({ issue })
  }

  const deletedIssues = _.differenceBy(ticketCache.getIssues(), issues, 'metadata.number')
  for (const issue of deletedIssues) {
    ticketCache.removeIssue({ issue })
  }

  return issues
}

export const list = loadOpenIssues

export async function getIssueComments ({ number }) {
  const ticketCache = cache.getTicketCache()
  const { metadata: { name, projectName } } = ticketCache.getIssue(number)
  const githubComments = await getComments({ number })
  return _.map(githubComments, githubComment => fromComment(number, name, projectName, githubComment))
}

export async function loadIssueComments ({ number }) {
  const comments = await getIssueComments({ number })
  const ticketCache = cache.getTicketCache()
  for (const comment of comments) {
    ticketCache.addOrUpdateComment({ issueNumber: number, comment })
  }

  const deletedComments = _.differenceBy(ticketCache.getCommentsForIssue({ issueNumber: number }), comments, 'metadata.id')
  for (const comment of deletedComments) {
    ticketCache.removeComment({ issueNumber: number, comment })
  }

  return comments
}
