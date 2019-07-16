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

const { clone, split, first } = require('lodash')
const uuidv1 = require('uuid/v1')
const x509 = require('x509.js')
const jwt = require('jsonwebtoken')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')

const originalInit = Symbol('Request.prototype.init')
const requestId = Symbol('Request.id')

function onRequest (req) {
  this[requestId] = uuidv1()
  const user = {
    id: undefined,
    type: undefined
  }
  const headers = clone(this.headers)
  const [schema, value] = split(headers.authorization, ' ') || []
  delete headers.authorization
  switch (schema) {
    case 'Bearer':
      const payload = jwt.decode(value)
      if (payload) {
        if (payload.email) {
          user.type = 'email'
          user.id = payload.email
        } else {
          user.type = 'sub'
          user.id = payload.sub
        }
      } else {
        user.type = 'bearer'
        user.id = value
      }
      break
    case 'Basic':
      user.type = 'user'
      user.id = first(split(decodeBase64(value), ':'))
      break
  }
  if (this.key && this.cert) {
    try {
      const { subject } = x509.parseCert(this.cert)
      user.type = 'cn'
      user.id = subject.commonName
    } catch (err) { /* ignore error */ }
  }
  logger.request({
    id: this[requestId],
    uri: this.uri,
    method: this.method,
    httpVersion: '1.1',
    user: user.id ? user : undefined,
    headers,
    body: this.body
  })
}

function onComplete (res, body) {
  logger.response({
    id: this[requestId],
    statusCode: res.statusCode,
    reasonPhrase: res.statusMessage,
    httpVersion: res.httpVersion,
    headers: clone(res.headers),
    body
  })
}

function onRedirect () {
  logger.response({
    id: this[requestId],
    statusCode: this.response.statusCode,
    reasonPhrase: this.response.statusMessage,
    httpVersion: this.response.httpVersion,
    headers: clone(this.response.headers),
    body: JSON.stringify({
      uri: this.uri.href
    })
  })
}

module.exports = Request => {
  if (Request.prototype && !Request.prototype[originalInit]) {
    Request.prototype[originalInit] = Request.prototype.init

    Request.prototype.init = function init () {
      this.on('request', onRequest)
      this.on('complete', onComplete)
      this.on('redirect', onRedirect)
      return Request.prototype[originalInit].apply(this, arguments)
    }
  }
}
