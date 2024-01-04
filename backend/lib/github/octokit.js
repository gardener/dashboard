//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Agent } = require('https')
const _ = require('lodash')
const { Octokit: Core } = require('@octokit/core')
const { createAppAuth } = require('@octokit/auth-app')
const { requestLog } = require('@octokit/plugin-request-log')
const { legacyRestEndpointMethods } = require('@octokit/plugin-rest-endpoint-methods')
const { paginateRest } = require('@octokit/plugin-paginate-rest')
const { paginateGraphql } = require('@octokit/plugin-paginate-graphql')
const config = require('../config')
const logger = require('../logger')
const Octokit = Core.plugin(requestLog, legacyRestEndpointMethods, paginateRest, paginateGraphql)

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
  const {
    token,
    appId,
    clientId,
    clientSecret,
    installationId,
    privateKey
  } = auth || {}
  if (token) {
    return {
      auth: token
    }
  }
  if (appId && clientId && clientSecret && installationId && privateKey) {
    return {
      authStrategy: createAppAuth,
      auth: {
        appId,
        clientId,
        clientSecret,
        installationId,
        privateKey
      }
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
  const authOptions = getAuthOptions(authentication)
  options = _.merge({}, {
    ...authOptions,
    baseUrl: _.replace(baseUrl, /\/$/, ''),
    previews: ['symmetra'],
    log: OctokitLog,
    request: {
      agent,
      timeout
    }
  }, options)

  return new Octokit(options)
}

module.exports = init
