//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const { loadOpenIssues } = require('../services/journals')
const { getJournalCache } = require('../cache')
const config = require('../config')

module.exports = io => {
  if (!config.gitHub) {
    logger.warn('Missing gitHub property in config for journals feature')
    return
  }

  const cache = getJournalCache()
  cache.onIssue(event => {
    const room = 'issues'
    io.of('/journals').to(room).emit('events', {
      kind: 'issues',
      events: [event]
    })
  })
  cache.onComment(event => {
    const { namespace, name } = event.object.metadata
    const room = `comments_${namespace}/${name}`
    io.of('/journals').to(room).emit('events', {
      kind: 'comments',
      events: [event]
    })
  })

  function loadAllOpenIssues (cb) {
    loadOpenIssues().then(() => cb(), err => cb(err))
  }

  const call = backoff.call(loadAllOpenIssues, err => {
    if (err) {
      logger.error('failed to fetch journals', err)
    } else {
      logger.info('successfully fetched journals')
    }
  })
  call.retryIf(err => {
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
