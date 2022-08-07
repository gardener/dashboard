//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const createError = require('http-errors')
const { createSession } = require('better-sse')
const { authorization } = require('../services')
const channels = require('../channels')
const cache = require('../cache')

const router = module.exports = express.Router()

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
  const args = pathname.split('/')
  return {
    key,
    labels,
    args
  }
}

function canSubscribeTopic (user, topic) {
  const { key, args } = parseTopic(topic)
  switch (key) {
    case 'shoots': {
      if (!args.length) {
        return authorization.isAdmin(user)
      }
      const [namespace, name] = args
      if (!name) {
        return authorization.canListShoots(user, namespace)
      }
      return authorization.canGetShoot(user, namespace, name)
    }
  }
  return Promise.reject(new TypeError('Invalid topic'))
}

function authorizeTopicFn (user) {
  return async topic => {
    if (!await canSubscribeTopic(user, topic)) {
      throw createError(403, `No authorization to subscribe topic "${topic}"`)
    }
  }
}

async function authorizationMiddleware (req, res, next) {
  const user = req.user
  const topics = getTopics(req.query)
  try {
    await Promise.all(topics.map(authorizeTopicFn(user)))
    next()
  } catch (err) {
    next(err)
  }
}

async function handleEventStream (req, res) {
  const user = req.user
  const state = {
    username: user.id,
    groups: user.groups,
    events: [],
    metadata: null
  }
  const channelKeys = []
  const topics = getTopics(req.query)
  for (const topic of topics) {
    const { key, labels, args } = parseTopic(topic)
    switch (key) {
      case 'shoots': {
        state.events.push('shoots', 'issues')
        if (args.length) {
          const [namespace, name] = args
          const projectName = cache.findProjectByNamespace(namespace)?.metadata.name
          state.metadata = { namespace, projectName }
          if (name) {
            state.events.push('comments')
            state.metadata.name = name
          }
        }
        channelKeys.push('tickets')
        channelKeys.push(labels.includes('unhealthy') ? 'unhealthyShoots' : 'shoots')
        break
      }
    }
  }
  const session = await createSession(req, res)
  Object.assign(session.state, state)
  for (const key of channelKeys) {
    channels[key].register(session)
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
