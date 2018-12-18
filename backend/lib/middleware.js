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
const got = require('got')
const expressJwt = require('express-jwt')
const jwks = require('jwks-rsa')
const { JwksError } = jwks
const config = require('./config')
const logger = require('./logger')
const { NotFound, Unauthorized, InternalServerError } = require('./errors')
const { customAddonDefinitions } = require('./services')
const client = require('prom-client')
const secretProvider = jwtSecret(config.jwks)

function prometheusMetrics ({ timeout = 30000 } = {}) {
  client.collectDefaultMetrics({ timeout })

  return (req, res, next) => {
    res.set('Content-Type', client.register.contentType)
    res.end(client.register.metrics())
  }
}

async function frontendConfig (req, res, next) {
  const user = req.user
  const frontendConfig = _.cloneDeep(config.frontend)
  try {
    frontendConfig.customAddonDefinitions = await customAddonDefinitions.list({ user, namespace: 'garden' })
  } catch (err) { /* ignore error */ }
  res.json(frontendConfig)
}

async function jsonWebKeySet (req, res, next) {
  try {
    const { jwksUri, ca, rejectUnauthorized = true } = config.jwks || {}
    const response = await got(jwksUri, { json: true, ca, rejectUnauthorized })
    res.json(response.body)
  } catch (err) {
    next(err)
  }
}

function attachAuthorization (req, res, next) {
  const [scheme, bearer] = req.headers.authorization.split(' ')
  if (!/bearer/i.test(scheme)) {
    return next(new Unauthorized('No authorization header with bearer'))
  }
  req.user.auth = { bearer }
  req.user.id = req.user['email']

  next()
}

function jwt (options) {
  const secret = secretProvider
  options = _.assign({ secret }, config.jwt, options)
  return expressJwt(options)
}

function getKeysMonkeyPatch (cb) {
  const json = true
  const headers = _.assign({}, this.options.headers)
  const uri = this.options.jwksUri
  const ca = this.options.ca
  const rejectUnauthorized = _.get(this.options, 'rejectUnauthorized', true)
  this.logger(`Fetching keys from '${uri}'`)
  got(uri, { json, headers, ca, rejectUnauthorized })
    .then(res => {
      const keys = _.get(res, 'body.keys')
      this.logger('Keys:', keys)
      return cb(null, keys)
    })
    .catch(err => {
      if (err instanceof got.HTTPError) {
        this.logger('Http Error:', err.body || err)
        return cb(new JwksError(_.get(err, 'body.message', err.message)))
      }
      this.logger('Failure:', err)
      cb(err)
    })
}

function jwtSecret (options) {
  const client = jwks(options)
  client.getKeys = getKeysMonkeyPatch
  return function secretProvider (req, header, payload, cb) {
    // only RS256 is supported.
    if (_.get(header, 'alg') !== 'RS256') {
      return cb(new Error('Only RS256 is supported as id_token signing algorithm'))
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return cb(err)
      }
      return cb(null, key.publicKey || key.rsaPublicKey)
    })
  }
}

function historyFallback (filename) {
  return (req, res, next) => {
    if (!_.includes(['GET', 'HEAD'], req.method) || !req.accepts('html')) {
      return next()
    }
    res.sendFile(filename, err => {
      if (err) {
        next(new InternalServerError(err.message))
      }
    })
  }
}

function notFound (req, res, next) {
  next(new NotFound('The server has not found anything matching the Request-URI'))
}

function errorToLocals (err, req) {
  const message = err.message
  let reason = err.reason || 'Internal Error'
  const name = err.name
  const error = req.app.get('env') === 'development' ? err : { name }
  let status = 500
  if (_.isInteger(err.code)) {
    status = err.code
  } else if (_.isString(err.code) && /[0-9]+/.test(err.code)) {
    status = parseInt(err.code)
  } else {
    logger.error(`Error with invalid code ${err.code}:`, err.message, err.stack)
  }
  if (status < 100 || status >= 600) {
    status = 500
  }
  if (_.includes(['UnauthorizedError', 'JwksError', 'SigningKeyNotFoundError'], name)) {
    status = 401
    reason = 'Authentication Error'
  }
  if (status >= 500) {
    logger.error(err.message, err.stack)
  }
  return { message, reason, status, error }
}

function sendError (err, req, res, next) {
  const locals = errorToLocals(err, req)
  res.status(locals.status).send(locals)
}

function renderError (err, req, res, next) {
  const locals = errorToLocals(err, req)

  res.format({
    json: () => res.status(locals.status).send(locals),
    default: () => res.status(locals.status).send(ErrorTemplate(locals))
  })
}

const ErrorTemplate = _.template(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'self'; connect-src 'self'; form-action 'self'; img-src data:; script-src 'self'; style-src 'unsafe-inline'">
  <meta content="origin" name="referrer">
  <title><%= reason %> &middot; Gardener</title>
  <style type="text/css" media="screen">
    body {
      padding: 50px;
      font: 14px "Lucida Grande", Helvetica, Arial, sans-serif;
    }
    a {
      color: #00B7FF;
    }
  </style>
  </head>
</head>
<body>
  <h1><%= message %></h1>
  <h2><%= status %></h2>
  <% if (error.stack) { %><pre><%= error.stack %></pre><% } %>
</body>
</html>`)

module.exports = {
  jwt,
  jwtSecret,
  attachAuthorization,
  frontendConfig,
  jsonWebKeySet,
  historyFallback,
  notFound,
  sendError,
  renderError,
  ErrorTemplate,
  prometheusMetrics
}
