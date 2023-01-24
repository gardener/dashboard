//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const pRetry = require('p-retry')
const logger = require('../logger')
const config = require('../config')
const cache = require('../cache')
const tickets = require('../services/tickets')

async function loadAllOpenIssues(retryOptions) {
  const options = {
    forever: true,
    retries: undefined, // because of retriesLeft calculation in onFailedAttempt
    maxTimeout: 60e3,
    ...retryOptions,
    onFailedAttempt(err) {
      if ([500, 502, 503, 504, 521, 522, 524].indexOf(err.status) === -1) {
        throw err
      }
      logger.info(`Attempt ${err.attemptNumber} failed. Will retry to fetch tickets`)
    }
  }
  try {
    await pRetry(() => tickets.loadOpenIssues(), options)
    logger.info('successfully fetched tickets')
  } catch (err) {
    logger.error('failed to fetch tickets', err)
  }
}

async function pollTickets(ticketCache) {
  await loadAllOpenIssues()

  const issueNumbers = ticketCache.getIssueNumbers()
  for (const number of issueNumbers) {
    try {
      await tickets.loadIssueComments({ number })
    } catch (err) {
      logger.error('failed to fetch comments for reopened issue %s: %s', number, err)
    }
  }
}

function createPollTriggers(leaseInformer, signal, pollTickets) {
  let timerId
  const updateListener = () => pollTickets()

  // time based
  const pollInterval = parseInt(config.gitHub.pollIntervalSeconds) * 1000

  if (!isNaN(pollInterval)) {
    timerId = setInterval(updateListener, pollInterval)
  }

  // The lease is updated when receiving a GitHub webhook. So check if it is configured.
  if (config.gitHub.webhookSecret) {
    leaseInformer.on('update', updateListener)
  }

  signal.addEventListener('abort', () => {
    clearInterval(timerId)
    leaseInformer.removeListener('update', updateListener)
  }, { once: true })
}

/**
 * Based on lodash.throttle but accepting an fn that returns a Promise.
 * Unlike lodash.throttle this version ensures that atmost one invocation
 * of fn is running.
 */
function throttledAsync(fn, time) {
  let currentlyExecuting = false
  let nextExecutionArgs = null

  const fnWrapper = async (...args) => {
    if (currentlyExecuting) {
      nextExecutionArgs = args
      return
    }
    currentlyExecuting = true

    try {
      await fn(...args)
    } catch (err) {
      logger.error('Throttled function errored with %s', err)
    } finally {
      if (nextExecutionArgs) process.nextTick(throttledFn.bind(null, ...nextExecutionArgs))

      currentlyExecuting = false
      nextExecutionArgs = null
    }
  }

  const throttledFn = _.throttle(fnWrapper, time, {
    leading: true,
    trailing: true
  })

  return throttledFn
}

module.exports = async (io, leaseInformer, ticketCache, signal) => {
  if (!config.gitHub) {
    logger.warn('Missing gitHub property in config for tickets feature')
    return
  }
  const pollThrottle = parseInt(config.gitHub.pollThrottleSeconds) * 1000

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

  const wrappedPollTickets = () => pollTickets(ticketCache)
  const pollTriggerCallback = !isNaN(pollThrottle) && pollThrottle > 0
    ? throttledAsync(wrappedPollTickets, pollThrottle)
    : wrappedPollTickets

  await pollTriggerCallback()

  createPollTriggers(leaseInformer, signal, pollTriggerCallback)
}
