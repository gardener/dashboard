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

const assert = require('assert')
const { Readable, Transform } = require('stream')
const { Agent } = require('https')
const _ = require('lodash')
const octokitRest = require('@octokit/rest')
const config = require('../config')

function getAuthenticationOptions () {
  const {
    username,
    password,
    key,
    secret,
    token
  } = _.get(config, 'gitHub.authentication', {})
  if (username && password) {
    return {
      type: 'basic',
      username,
      password
    }
  }
  if (key && secret) {
    return {
      type: 'oauth',
      key,
      secret
    }
  }
  if (token) {
    return {
      type: 'token',
      token
    }
  }
}

function reduce (stream, reducer = (data, chunk) => _.concat(data, chunk), data = []) {
  return new Promise((resolve, reject) => {
    stream.on('readable', () => {
      let chunk
      while ((chunk = stream.read())) {
        data = reducer(data, chunk)
      }
    })
    stream.once('error', err => reject(err))
    stream.once('end', () => resolve(data))
  })
}

function thru (stream, interceptor = _.identity) {
  const transformer = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform (chunk, encoding, done) {
      try {
        if (_.isFunction(interceptor)) {
          chunk = interceptor(chunk)
        }
        if (Array.isArray(chunk) && chunk.length) {
          this.push(chunk)
        }
        done()
      } catch (err) {
        done(err)
      }
    }
  })
  transformer.reduce = _.partial(reduce, transformer)
  transformer.thru = _.partial(thru, transformer)
  return stream
    .once('error', err => transformer.emit('error', err))
    .pipe(transformer)
}

class PageStream extends Readable {
  constructor (octokit, method, { path_to_items: pathToItems, ...options } = {}) {
    super({
      objectMode: true,
      highWaterMark: 16
    })
    this._octokit = octokit
    this._pathToItems = pathToItems
    this._func = _.partial(method, options)
    this._response = undefined
    this._stopped = true
    this._eof = false
    this._failed = false
  }

  _read () {
    this.startReading()
  }

  get _continue () {
    return !this._eof && !this._stopped && !this._failed
  }

  get _initial () {
    return !this._response
  }

  get _finished () {
    return !this._initial && !this.hasNextPage
  }

  get hasNextPage () {
    return this._octokit.hasNextPage(this._response)
  }

  readFirstPage () {
    return this._func()
  }

  readNextPage () {
    return this._octokit.getNextPage(this._response)
  }

  startReading () {
    if (this._stopped) {
      this._stopped = false
      process.nextTick(() => this.readPages())
    }
  }

  stopReading () {
    this._stopped = true
  }

  handleError (err) {
    this._failed = true
    process.nextTick(() => this.emit('error', err))
  }

  async readPages () {
    while (this._continue) {
      if (this._finished) {
        this._eof = true
        this.push(null)
        break
      }
      try {
        await this.readPage()
      } catch (err) {
        this.handleError(err)
      }
    }
  }

  async readPage () {
    this._response = this._initial
      ? await this.readFirstPage()
      : await this.readNextPage()
    const { data, status } = this._response
    assert.strictEqual(status, 200)
    const items = this._pathToItems ? _.get(data, this._pathToItems) : data
    if (!_.isEmpty(items)) {
      if (!this.push(items)) {
        this.stopReading()
      }
    }
  }

  thru (...args) {
    return thru(this, ...args)
  }

  reduce (...args) {
    return reduce(this, ...args)
  }
}

function init (options) {
  const {
    apiUrl: baseUrl = 'https://api.github.com',
    ca,
    timeout = 30000
  } = _.get(config, 'gitHub', {})
  let agent = false
  if (ca) {
    agent = new Agent({
      ca,
      keepAlive: true
    })
  }
  options = _.merge({}, {
    baseUrl: _.replace(baseUrl, /\/$/, ''),
    timeout,
    agent,
    headers: {
      accept: 'application/vnd.github.v3+json, application/vnd.github.symmetra-preview+json'
    }
  }, options)

  function createPageStream (method, options) {
    return new PageStream(this, method, options)
  }

  const octokit = octokitRest(options)
  octokit.createPageStream = createPageStream
  const auth = getAuthenticationOptions()
  if (_.isPlainObject(auth)) {
    octokit.authenticate(auth)
  }
  return octokit
}

module.exports = init
