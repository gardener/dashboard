//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Agent } = require('https')
const _ = require('lodash')
const { Octokit } = require('@octokit/rest')
const config = require('../config')
const logger = require('../logger')

class OctokitLog {
  static debug (...args) {
    logger.debug(...args)
  }

  static info (...args) {
    logger.info(...args)
  }

  static warn (...args) {
    logger.warn(...args)
  }

  static error (...args) {
    logger.error(...args)
  }
}

function getAuthOptions (auth) {
  if (auth && _.isString(auth)) {
    return auth
  }
  const {
    token,
    username,
    password,
    clientId,
    clientSecret,
    key,
    secret
  } = auth || {}
  if (token) {
    return `token ${token}`
  }
  if (username && password) {
    return {
      username,
      password
    }
  }
  if (clientId && clientSecret) {
    return {
      clientId,
      clientSecret
    }
  }
  if (key && secret) {
    return {
      clientId: key,
      clientSecret: secret
    }
  }
}

function init (options) {
  const {
    gitHub: {
      apiUrl: baseUrl = 'https://api.github.com',
      ca,
      timeout = 30000,
      authentication
    } = {}
  } = config
  let agent = false
  if (ca) {
    agent = new Agent({
      ca,
      keepAlive: true
    })
  }
  const auth = getAuthOptions(authentication)
  options = _.merge({}, {
    auth,
    baseUrl: _.replace(baseUrl, /\/$/, ''),
    previews: ['symmetra'],
    log: OctokitLog,
    request: {
      agent,
      timeout
    }
  }, options)

  return Octokit(options)
}

module.exports = init
