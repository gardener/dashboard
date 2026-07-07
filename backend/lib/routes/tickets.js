//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import _ from 'lodash-es'
import createError from 'http-errors'
import cache from '../cache/index.js'
import * as tickets from '../services/tickets.js'
import { metricsRoute } from '../middleware.js'
import * as authorization from '../services/authorization.js'
import { projectFilter } from '../utils/index.js'

const router = express.Router({
  mergeParams: true,
})

const ticketCache = cache.getTicketCache()
const metricsMiddleware = metricsRoute('tickets')

async function getIssues (namespace, user) {
  const canListProjects = await authorization.canListProjects(user)
  let allowedProjects = cache.getProjects()
    .filter(projectFilter(user, canListProjects))

  if (namespace !== '_all') {
    const project = allowedProjects.find(project => project.spec.namespace === namespace)
    if (!project) {
      throw createError(403, `Forbidden to list tickets in namespace ${namespace}`)
    }
    allowedProjects = [project]
  }

  const allowedProjectNames = allowedProjects.map(project => project.metadata.name)
  return ticketCache.getIssues().filter(issue =>
    allowedProjectNames.includes(issue.metadata.projectName),
  )
}

async function getIssuesAndComments (namespace, name, user) {
  const issues = (await getIssues(namespace, user))
    .filter(issue => issue.metadata.name === name)
  const promises = _.map(issues, issue => tickets.getIssueComments({ number: issue.metadata.number }))
  const comments = _.flatten(await Promise.all(promises))
  return [issues, comments]
}

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const namespace = req.params.namespace
      const issues = await getIssues(namespace, req.user)
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
      const [issues, comments] = await getIssuesAndComments(namespace, name, req.user)
      res.send({ issues, comments })
    } catch (err) {
      next(err)
    }
  })

export default router
