//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const express = require('express')
const bodyParser = require('body-parser')
const { createHmac, timingSafeEqual } = require('crypto')
const config = require('../config')
const logger = require('../logger')
const { requestLogger } = require('../middleware')
const { InternalServerError, Forbidden } = require('http-errors')
const { fromIssue, fromComment, loadIssueComments } = require('../services/tickets')
const { getTicketCache } = require('../cache')

// router
const router = exports.router = express.Router()
router.use(requestLogger)
router.post('/', bodyParser.json({ verify: verifyHubSignature }), handleGithubEvent)

// security
const defaultSignatureAlgorithm = Buffer.from('73686131', 'hex').toString('ascii')

function verifyHubSignature (req, res, body) {
  const webhookSecret = _.get(config, 'gitHub.webhookSecret')
  if (!webhookSecret) {
    throw new InternalServerError('Property \'gitHub.webhookSecret\' not configured on dashboard backend')
  }
  const requestSignature = req.headers['x-hub-signature']
  if (!requestSignature) {
    throw new Forbidden('Header \'x-hub-signature\' not provided')
  }
  const algorithm = _.chain(requestSignature).split('=', 1).first().value()
  const signature = createHubSignature(webhookSecret, body, algorithm)
  if (!digestsEqual(requestSignature, signature)) {
    throw new Forbidden('Signatures didn\'t match!')
  }
}
exports.verifyHubSignature = verifyHubSignature

function digestsEqual (a, b) {
  if (!Buffer.isBuffer(a)) {
    a = Buffer.from(a, 'ascii')
  }
  if (!Buffer.isBuffer(b)) {
    b = Buffer.from(b, 'ascii')
  }
  return timingSafeEqual(a, b)
}
exports.digestsEqual = digestsEqual

function createHubSignature (secret, value, algorithm = defaultSignatureAlgorithm) {
  return `${algorithm}=${createHmac(algorithm, secret).update(value).digest('hex')}`
}
exports.createHubSignature = createHubSignature

// handler
function handleGithubEvent (req, res, next) {
  try {
    const event = req.headers['x-github-event']
    const { action, issue, comment } = req.body
    switch (event) {
      case 'issues':
        handleIssue({ action, issue })
        break
      case 'issue_comment':
        handleComment({ action, issue, comment })
        break
      default:
        logger.error(`Unhandled event: ${event}`)
    }
    res.end()
  } catch (err) {
    next(err)
  }
}
exports.handleGithubEvent = handleGithubEvent

function handleIssue ({ action, issue }) {
  const cache = getTicketCache()
  issue = fromIssue(issue)

  if (action === 'closed') {
    return cache.removeIssue({ issue })
  }
  cache.addOrUpdateIssue({ issue })

  if (action === 'reopened') {
    const {
      data: {
        comments: numberOfComments = 0
      } = {},
      metadata: {
        number
      } = {}
    } = issue
    if (!numberOfComments) {
      return
    }
    process.nextTick(async () => {
      try {
        await loadIssueComments({ number })
      } catch (err) {
        logger.error('failed to fetch comments for reopened issue %s: %s', number, err)
      }
    })
  }
}
exports.handleIssue = handleIssue

function handleComment ({ action, issue, comment }) {
  const cache = getTicketCache()
  const {
    metadata: { projectName, name, number: issueNumber } = {}
  } = issue = fromIssue(issue) || {}
  comment = fromComment(issueNumber, name, projectName, comment)

  if (!cache.getIssue(issueNumber)) {
    logger.debug('skipping github event issue_comment for issue number %s', issueNumber)
    return
  }

  cache.addOrUpdateIssue({ issue })

  if (action === 'deleted') {
    return cache.removeComment({ issueNumber, comment })
  }
  cache.addOrUpdateComment({ issueNumber, comment })
}
exports.handleComment = handleComment
