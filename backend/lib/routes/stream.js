//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const express = require('express')
const createError = require('http-errors')
const { Session } = require('better-sse')
const { authorization } = require('../services')
const channels = require('../channels')
const cache = require('../cache')
const logger = require('../logger')
const { projectFilter } = require('../utils')

const router = module.exports = express.Router()

function randomTime (a, b) {
  return a + Math.floor(Math.random() * b)
}

async function createSession (req, res) {
  const { query, user, topics } = req
  const keepAlive = Number(query.keepAlive ?? 15) * 1000
  const retry = randomTime(1000, 500) // wait 1-1.5 sec before attempting to reconnect
  const clientShutdownTimeout = randomTime(2000, 1000)
  const expiresIn = () => Math.max(0, user.refresh_at * 1000 - Date.now())

  let statusCode = 200
  let message
  const rejectedTopic = topics.find(({ status }) => status === 'rejected')
  if (rejectedTopic) {
    const error = rejectedTopic.reason
    statusCode = error.statusCode
    message = error.message
  }

  return new Promise(resolve => {
    const session = new Session(req, res, {
      retry,
      keepAlive: null // do not send comments to keep the connection alive (we have our own heartbeat implementation)
    })
    let shutdownTimer
    const closeResponse = () => {
      session.push(null, 'reconnect')
      shutdownTimer = setTimeout(() => res.end(), clientShutdownTimeout)
    }
    const sendEvent = (event, data) => {
      session.push({
        time: new Date().toISOString(),
        rti: user.rti,
        expiresIn: Math.floor(expiresIn() / 1000),
        ...data
      }, event)
    }
    const heartbeatTimer = setInterval(() => sendEvent('heartbeat'), keepAlive)
    session.once('disconnected', () => {
      clearInterval(heartbeatTimer)
      clearTimeout(shutdownTimer)
    })
    session.once('connected', () => {
      logger.debug('SSE Session connected')
      sendEvent('connected', { statusCode, message })
      setTimeout(closeResponse, expiresIn())
      resolve(session)
    })
  })
}

function getTopics ({ topic }) {
  return Array.isArray(topic)
    ? topic
    : typeof topic === 'string'
      ? [topic]
      : []
}

function parseTopic (topic) {
  const [id, pathname] = topic.split(';')
  const [key, ...labels] = id.split(':')
  const args = typeof pathname === 'string' ? pathname.split('/') : []
  return {
    key,
    labels,
    args
  }
}

// TODO extract metadata parsing from args
async function canSubscribeTopic (user, topic) {
  const { key, args } = topic
  switch (key) {
    case 'shoots': {
      if (args.length) {
        const [namespace, name] = args
        const projectName = cache.findProjectByNamespace(namespace)?.metadata.name
        if (!name) {
          const allowed = authorization.canListShoots(user, namespace)
          topic.metadata = { projectName, namespace }
          return allowed
        }
        const allowed = authorization.canGetShoot(user, namespace, name)
        topic.metadata = { projectName, namespace, name }
        return allowed
      } else if (await authorization.isAdmin(user)) {
        topic.metadata = { allNamespaces: true }
        return true
      }
      const projects = _
        .chain(cache.getProjects())
        .filter(projectFilter(user, false))
        .value()
      const namespaces = _.map(projects, 'spec.namespace')
      const projectNames = _.map(projects, 'metadata.name')
      const canListShootsList = await Promise.all(namespaces.map(namespace => authorization.canListShoots(user, namespace)))
      const allowed = canListShootsList.every(value => value)
      topic.metadata = { projectNames, namespaces }
      return allowed
    }
  }
  throw new TypeError('Invalid topic')
}

function authorizeTopicFn (user) {
  return async topic => {
    const parsedTopic = parseTopic(topic)
    if (!await canSubscribeTopic(user, parsedTopic)) {
      throw createError(403, `No authorization to subscribe topic "${topic}"`, {
        topic: parsedTopic
      })
    }
    return parsedTopic
  }
}

async function authorizationMiddleware (req, res, next) {
  const user = req.user
  const authorizeTopic = authorizeTopicFn(user)
  const topics = getTopics(req.query)
  req.topics = await Promise.allSettled(topics.map(authorizeTopic))
  next()
}

async function handleEventStream (req, res) {
  const { user, topics } = req
  const state = {
    username: user.id,
    groups: user.groups,
    events: [],
    metadata: {}
  }
  const channelKeys = []
  for (const { status, value } of topics) {
    if (status === 'fulfilled') {
      const { key, labels, metadata } = value
      switch (key) {
        case 'shoots': {
          Object.assign(state.metadata, metadata)
          state.events.push('shoots', 'issues')
          if (state.metadata.name) {
            state.events.push('comments')
          }
          channelKeys.push('tickets')
          channelKeys.push(labels.includes('unhealthy') ? 'unhealthyShoots' : 'shoots')
          break
        }
      }
    }
  }
  const session = await createSession(req, res)
  if (channelKeys.length) {
    Object.assign(session.state, state)
    for (const key of channelKeys) {
      channels[key].register(session)
    }
  }
}

function allowedMethods (methods) {
  return (req, res, next) => {
    try {
      const method = req.method
      if (!methods.includes(method)) {
        throw createError(405, `Request method ${method} is not allowed for the SSE endpoint`)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

router.use(allowedMethods(['GET']))

router.get('/', [authorizationMiddleware], handleEventStream)
