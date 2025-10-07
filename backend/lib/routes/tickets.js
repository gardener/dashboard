//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import _ from 'lodash-es'
import cache from '../cache/index.js'
import * as tickets from '../services/tickets.js'
import { metricsRoute } from '../middleware.js'

const router = express.Router({
  mergeParams: true,
})

const ticketCache = {}// TODO cache.getTicketCache()
const metricsMiddleware = metricsRoute('tickets')

function getProjectName (namespace = '_all') {
  if (namespace !== '_all') {
    // TODO
    // return cache.findProjectByNamespace(namespace).metadata.name
  }
}
function getIssues (namespace) {
  // const projectName = getProjectName(namespace)
  // const predicate = projectName
  //   ? ['metadata.projectName', projectName]
  //   : () => true
  // return _.filter(ticketCache.getIssues(), predicate)
  // TODO
  return []
}

async function getIssuesAndComments (namespace, name) {
  // const projectName = getProjectName(namespace)
  // const issues = _.filter(ticketCache.getIssues(), { metadata: { projectName, name } })
  // const promises = _.map(issues, issue => tickets.getIssueComments({ number: issue.metadata.number }))
  // const comments = _.flatten(await Promise.all(promises))
  // return [issues, comments]
  return []
}

router.route('/')
  .all(metricsMiddleware)
  .get((req, res, next) => {
    try {
      const namespace = req.params.namespace
      const issues = getIssues(namespace)
      res.send({ issues })
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const namespace = req.params.namespace
      const name = req.params.name
      const [issues, comments] = await getIssuesAndComments(namespace, name)
      res.send({ issues, comments })
    } catch (err) {
      next(err)
    }
  })

export default router
