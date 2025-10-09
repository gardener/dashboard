//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import pLimit from 'p-limit'
import logger from '../logger/index.js'
import config from '../config/index.js'
import cache from '../cache/index.js'
import * as tickets from '../services/tickets.js'
import SyncManager from '../github/SyncManager.js'

// exported for testing
export const test = {
  loadOpenIssuesAndComments: async function (concurrency) {
    const issues = await tickets.loadOpenIssues()

    const limit = pLimit(concurrency)
    const input = issues.map((issue) => {
      const { number } = issue.metadata
      return limit(() => tickets.loadIssueComments({ number }))
    })

    await Promise.all(input)
  },
}

export default (io, informer, { signal }) => {
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
      `shoots;${namespace}/${name}`,
    ]
    nsp.to(rooms).emit('comments', event)
  })

  const { pollIntervalSeconds, syncThrottleSeconds, syncConcurrency } = config.gitHub
  const syncManager = new SyncManager(() => {
    return test.loadOpenIssuesAndComments(syncConcurrency || 10)
  }, {
    interval: pollIntervalSeconds * 1000 || 0,
    throttle: syncThrottleSeconds * 1000 || 0,
    signal,
  })
  syncManager.sync()

  const handleEvent = event => syncManager.sync()
  informer.on('update', object => handleEvent({ type: 'MODIFIED', object }))
}
