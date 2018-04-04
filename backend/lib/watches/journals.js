//
// Copyright 2018 by The Gardener Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const logger = require('../logger')
const backoff = require('backoff')
const { journals } = require('../services')
const { getJournalCache } = require('../cache')
const config = require('../config')

module.exports = async io => {
  if (!config.gitHub) {
    logger.warn('Missing gitHub property in config for journals feature')
    return
  }

  getJournalCache().subscribeIssues(event => {
    io.of('/journals').to('issues').emit('event', event)
  })
  getJournalCache().subscribeComments(event => {
    const name = event.object.metadata.name
    const namespace = event.object.metadata.namespace
    logger.debug(`emitting event to room comments_${namespace}/${name}`)
    io.of('/journals').to(`comments_${namespace}/${name}`).emit('event', event)
  })

  const listJournals = async (param, fn) => {
    try {
      await journals.list({})
      fn(undefined)
    } catch (err) {
      fn(err)
    }
  }
  const call = backoff.call(listJournals, {}, function (err) {
    if (err) {
      logger.error('failed to fetch journals', err)
    } else {
      logger.info('successfully fetched journals')
    }
  })

  call.retryIf(function (err) {
    const willRetry = err.status === 503
    logger.info('will retry to fetch journals', willRetry)
    return willRetry
  })
  call.setStrategy(new backoff.FibonacciStrategy({
    initialDelay: 1e3,
    maxDelay: 60e3,
    randomisationFactor: 0
  }))
  call.start()
}
