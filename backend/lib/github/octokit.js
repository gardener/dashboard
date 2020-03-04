//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
