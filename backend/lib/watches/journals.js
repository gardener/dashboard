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

const pRetry = require('p-retry')
const logger = require('../logger')
const journals = require('../services/journals')
const cache = require('../cache')
const config = require('../config')

module.exports = (io, retryOptions = {}) => {
  if (!config.gitHub) {
    logger.warn('Missing gitHub property in config for journals feature')
    return
  }

  const journalCache = cache.getJournalCache()
  journalCache.onIssue(event => {
    const room = 'issues'
    io.of('/journals').to(room).emit('events', {
      kind: 'issues',
      events: [event]
    })
  })
  journalCache.onComment(event => {
    const { namespace, name } = event.object.metadata
    const room = `comments_${namespace}/${name}`
    io.of('/journals').to(room).emit('events', {
      kind: 'comments',
      events: [event]
    })
  })

  async function loadAllOpenIssues () {
    const options = {
      retries: 0,
      forever: true,
      maxTimeout: 60e3,
      ...retryOptions,
      onFailedAttempt (err) {
        if ([500, 502, 503, 504, 521, 522, 524].indexOf(err.status) === -1) {
          throw err
        }
        logger.info(`Attempt ${err.attemptNumber} failed. Will retry to fetch journals`)
      }
    }
    try {
      await pRetry(() => journals.loadOpenIssues(), options)
      logger.info('successfully fetched journals')
    } catch (err) {
      logger.error('failed to fetch journals', err)
    }
  }

  loadAllOpenIssues()
}
