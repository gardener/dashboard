//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const logger = require('../logger')
const github = require('../github')
const cache = require('../cache')

function fromLabel (item) {
  return _.pick(item, [
    'id',
    'name',
    'color'
  ])
}

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
        'state'
      ])
      .assign({
        projectName,
        name
      })
      .value(),
    data: _
      .chain(issue)
      .pick([
        'user.login',
        'user.avatar_url',
        'html_url',
        'body',
        'comments'
      ])
      .assign({
        labels,
        ticketTitle
      })
      .value()
  }
}
exports.fromIssue = fromIssue

function fromComment (number, name, projectName, item) {
  return {
    kind: 'comment',
    metadata: _
      .chain(item)
      .pick([
        'id',
        'created_at',
        'updated_at'
      ])
      .assign({
        number,
        name,
        projectName
      })
      .value(),
    data: _.pick(item, [
      'user.login',
      'user.avatar_url',
      'body',
      'html_url'
    ])
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

async function finalizeIssue (number) {
  const { data: githubIssue } = await github.getIssue({ number })
  const issue = fromIssue(githubIssue)

  if (issue.metadata.state === 'closed') {
    logger.debug('Ticket already closed. Removing from cache..')
    const ticketCache = cache.getTicketCache()
    ticketCache.removeIssue({ issue })

    return
  }

  await github.createComment({ number }, '_[Auto-closed due to Shoot deletion]_')
  await github.closeIssue({ number })
}

function deleteTickets ({ name, projectName }) {
  const ticketCache = cache.getTicketCache()
  const numbers = ticketCache.getIssueNumbersForNameAndProjectName({ name, projectName })
  if (_.isEmpty(numbers)) {
    return Promise.resolve()
  }
  logger.debug('Deleting ticket for shoot %s/%s. Affected issue numbers: %s', projectName, name, _.join(numbers, ', '))
  return Promise.all(_.map(numbers, finalizeIssue))
}
exports.deleteTickets = deleteTickets

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
