//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const _ = require('lodash')
const axios = require('axios')
const https = require('https')
const logger = require('../logger')
const config = require('../config')
const parseLink = require('parse-link-header')
const { URL } = require('url')
const urljoin = require('url-join')

const fetch = async (url, batchFn) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await axios.get(url, { httpsAgent: agent, auth: authentication() })
      const link = _.get(result, 'headers.link', '')
      const nextLink = _.get(parseLink(link), 'next.url')
      batchFn(result.data)
      if (nextLink) {
        resolve(fetch(nextLink, batchFn))
      } else {
        resolve()
      }
    } catch (e) {
      reject(e)
    }
  })
}

const patch = async (url, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await axios.patch(url, payload, { httpsAgent: agent, auth: authentication() })
      resolve(result.data)
    } catch (e) {
      reject(e)
    }
  })
}

const post = async (url, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await axios.post(url, payload, { httpsAgent: agent, auth: authentication() })
      resolve(result.data)
    } catch (e) {
      reject(e)
    }
  })
}

const searchIssues = async function ({ namespace, name, batchFn = data => {} }) {
  let search = ' '
  if (namespace) {
    search = `${search}[${namespace}`
  }
  if (namespace || name) {
    search = `${search}/`
  }
  if (name) {
    search = `${search}${name}]`
  }

  const url = new URL(urljoin(config.gitHub.apiUrl, '/search/issues'))
  url.searchParams.set('q', `repo:${config.gitHub.org}/${config.gitHub.repository} is:open${search}`)

  return fetch(url.href, batchFn)
}

const comments = async function ({ issueNumber, batchFn = data => {} }) {
  if (!issueNumber) {
    logger.error('failed to read comments; invalid issueNumber')
    return Promise.reject(new Error('failed to read comments; invalid issueNumber'))
  }
  const url = new URL(urljoin(config.gitHub.apiUrl, '/repos/', config.gitHub.org, config.gitHub.repository, '/issues/', encodeURI(issueNumber), '/comments'))
  return fetch(url.href, batchFn)
}

const createComments = async function ({ issueNumber, payload }) {
  if (!issueNumber) {
    logger.error('failed to create comment; invalid issueNumber')
    return Promise.reject(new Error('failed to create comment; invalid issueNumber'))
  }
  if (!payload) {
    logger.error('no payload specified')
    return Promise.reject(new Error('no payload specified'))
  }
  const url = new URL(urljoin(config.gitHub.apiUrl, '/repos/', config.gitHub.org, config.gitHub.repository, '/issues/', encodeURI(issueNumber), '/comments'))

  return post(url.href, payload)
}

const closeIssue = async function ({ issueNumber }) {
  if (!issueNumber) {
    logger.error('failed to close issue; invalid issueNumber')
    return Promise.reject(new Error('failed to close issue; invalid issueNumber'))
  }
  const url = new URL(urljoin(config.gitHub.apiUrl, '/repos/', config.gitHub.org, config.gitHub.repository, '/issues/', encodeURI(issueNumber)))
  const payload = {
    state: 'closed'
  }
  return patch(url.href, payload)
}

const agent = new https.Agent({
  rejectUnauthorized: false
})

const authentication = function () {
  if (!config.gitHub.authentication) {
    return undefined
  }
  return {
    username: config.gitHub.authentication.username,
    password: config.gitHub.authentication.token
  }
}

module.exports = {
  searchIssues,
  comments,
  closeIssue,
  createComments
}
