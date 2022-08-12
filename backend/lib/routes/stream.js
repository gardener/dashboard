//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const express = require('express')
const createError = require('http-errors')
const { createSession } = require('better-sse')
const { authorization } = require('../services')
const channels = require('../channels')
const cache = require('../cache')
const { projectFilter } = require('../utils')

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
  const args = typeof pathname === 'string' ? pathname.split('/') : []
  return {
    key,
    labels,
    args
  }
}

async function canSubscribeTopic (user, topic) {
  const { key, args } = topic
  switch (key) {
    case 'shoots': {
      if (args.length) {
        const [namespace, name] = args
        const projectName = cache.findProjectByNamespace(namespace)?.metadata.name
        topic.metadata = { namespace, projectName }
        if (!name) {
          return authorization.canListShoots(user, namespace)
        }
        topic.metadata.name = name
        return authorization.canGetShoot(user, namespace, name)
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
      topic.metadata = { namespaces, projectNames }
      const canListShootsList = await Promise.all(namespaces.map(namespace => authorization.canListShoots(user, namespace)))
      return canListShootsList.every(value => value)
    }
  }
  throw new TypeError('Invalid topic')
}

function authorizeTopicFn (user) {
  return async topic => {
    const parsedTopic = parseTopic(topic)
    if (!await canSubscribeTopic(user, parsedTopic)) {
      throw createError(403, `No authorization to subscribe topic "${topic}"`)
    }
    return parsedTopic
  }
}

async function authorizationMiddleware (req, res, next) {
  const user = req.user
  const topics = getTopics(req.query)
  try {
    const authorizeTopic = authorizeTopicFn(user)
    req.topics = await Promise.all(topics.map(authorizeTopic))
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
    metadata: {}
  }
  const channelKeys = []
  const topics = req.topics
  for (const { key, labels, metadata } of topics) {
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
