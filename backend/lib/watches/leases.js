//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const logger = require('../logger')
const config = require('../config')
const cache = require('../cache')
const tickets = require('../services/tickets')
const SyncManager = require('../github/SyncManager')

async function loadOpenIssuesAndComments () {
  const issues = await tickets.loadOpenIssues()
  for (const issue of issues) {
    const number = issue.metadata.id
    await tickets.loadIssueComments({ number })
  }
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

  const { intervalSeconds, throttleSeconds } = config.gitHub.synchronization
  const syncManager = new SyncManager(loadOpenIssuesAndComments, {
    interval: intervalSeconds * 1000 || 0,
    throttle: throttleSeconds * 1000 || 0,
    signal
  })
  syncManager.sync()

  const handleEvent = event => syncManager.sync()
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
}

// exported for testing
module.exports.test = { loadOpenIssuesAndComments }
