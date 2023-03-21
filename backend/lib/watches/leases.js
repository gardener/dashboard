//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const pLimit = require('p-limit')
const logger = require('../logger')
const config = require('../config')
const cache = require('../cache')
const tickets = require('../services/tickets')
const SyncManager = require('../github/SyncManager')

async function loadOpenIssuesAndComments (concurrency) {
  const issues = await tickets.loadOpenIssues()

  const limit = pLimit(concurrency)
  const input = issues.map((issue) => {
    const { number } = issue.metadata
    return limit(() => tickets.loadIssueComments({ number }))
  })

  await Promise.all(input)
}

module.exports = (io, informer, { signal }) => {
  if (!config.gitHub) {
    logger.warn('Missing gitHub property in config for tickets feature')
    return
  }

  const ticketCache = cache.getTicketCache()
  const nsp = io.of('/')

  ticketCache.on('issue', event => nsp.emit('issues', event))
  ticketCache.on('comment', event => {
    const { projectName, name } = event.object.metadata
    const namespace = cache.getProjectNamespace(projectName)
    const rooms = [
      `shoots;${namespace}/${name}`
    ]
    nsp.to(rooms).emit('comments', event)
  })

  const { pollIntervalSeconds, syncThrottleSeconds, syncConcurrency } = config.gitHub
  const syncManager = new SyncManager(() => {
    return loadOpenIssuesAndComments(syncConcurrency || 10)
  }, {
    interval: pollIntervalSeconds * 1000 || 0,
    throttle: syncThrottleSeconds * 1000 || 0,
    signal
  })
  syncManager.sync()

  const handleEvent = event => syncManager.sync()
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
}

// exported for testing
module.exports.test = { loadOpenIssuesAndComments }
