//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const config = require('../config')
const github = require('../github')
const markdown = require('../markdown')
const cache = require('../cache')

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

const converter = exports.converter = markdown.createConverter(options)

function fromIssue (issue) {
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
exports.fromIssue = fromIssue

function fromComment (number, name, projectName, item) {
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
exports.fromComment = fromComment

async function getOpenIssues ({ name, projectName } = {}) {
  let title
  if (name && projectName) {
    title = `[${projectName}/${name}]`
  }
  const githubIssues = await github.searchIssues({ state: 'open', title })
  return _.map(githubIssues, fromIssue)
}
exports.getOpenIssues = getOpenIssues

async function loadOpenIssues (...args) {
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
exports.loadOpenIssues = exports.list = loadOpenIssues

async function getIssueComments ({ number }) {
  const ticketCache = cache.getTicketCache()
  const { metadata: { name, projectName } } = ticketCache.getIssue(number)
  const githubComments = await github.getComments({ number })
  return _.map(githubComments, githubComment => fromComment(number, name, projectName, githubComment))
}
exports.getIssueComments = getIssueComments

async function loadIssueComments ({ number }) {
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
exports.loadIssueComments = loadIssueComments
