//
// Copyright 2018 by The Gardener Authors.
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

const searchIssues = async function ({ namespace, name, options = {}, batchFn = data => {} }) {
  let search = ''
  if (namespace) {
    search = `${search}[${namespace}`
  }
  if (namespace || name) {
    search = `${search}/`
  }
  if (name) {
    search = `${search}${name}]`
  }

  search = encodeURI(search)
  const url = `${config.gitHub.apiUrl}/search/issues?&q=repo:${config.gitHub.org}/${config.gitHub.repository}%20is:open%20${search}`

  return fetch(url, batchFn)
}

const comments = async function ({ issueNumber, options = {}, batchFn = data => {} }) {
  if (!issueNumber) {
    logger.error('failed to read comments; invalid issueNumber')
    return undefined
  }
  const url = `${config.gitHub.apiUrl}/repos/${config.gitHub.org}/${config.gitHub.repository}/issues/${encodeURI(issueNumber)}/comments`
  return fetch(url, batchFn)
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
  comments
}
