//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const _ = require('lodash')
const cache = require('../cache')
const tickets = require('../services/tickets')

const router = module.exports = express.Router({
  mergeParams: true
})

const ticketCache = cache.getTicketCache()

function getProjectName (namespace = '_all') {
  if (namespace !== '_all') {
    return cache.findProjectByNamespace(namespace).metadata.name
  }
}
function getIssues (namespace) {
  const projectName = getProjectName(namespace)
  const predicate = projectName
    ? ['metadata.projectName', projectName]
    : () => true
  return _.filter(ticketCache.getIssues(), predicate)
}

async function getIssuesAndComments (namespace, name) {
  const projectName = getProjectName(namespace)
  const issues = _.filter(ticketCache.getIssues(), { metadata: { projectName, name } })
  const promises = _.map(issues, issue => tickets.getIssueComments({ number: issue.metadata.number }))
  const comments = _.flatten(await Promise.all(promises))
  return [issues, comments]
}

router.route('/')
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
