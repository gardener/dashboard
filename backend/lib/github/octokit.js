//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Agent } from 'https'
import _ from 'lodash-es'
import { Octokit as Core } from '@octokit/core'
import { createAppAuth } from '@octokit/auth-app'
import { requestLog } from '@octokit/plugin-request-log'
import { legacyRestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { paginateGraphql } from '@octokit/plugin-paginate-graphql'
import config from '../config/index.js'
import logger from '../logger/index.js'

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
    privateKey,
  } = auth || {}
  if (token) {
    return {
      auth: token,
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
        privateKey,
      },
    }
  }
}

function init (options) {
  const {
    gitHub: {
      apiUrl: baseUrl = 'https://api.github.com',
      ca,
      timeout = 30000,
      authentication,
    } = {},
  } = config
  let agent = false
  if (ca) {
    agent = new Agent({
      ca,
      keepAlive: true,
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
      timeout,
    },
  }, options)
  return new Octokit(options)
}

export default init
