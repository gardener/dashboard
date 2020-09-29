//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const config = require('./config')
const logger = require('./logger')
const { NotFound, InternalServerError, isHttpError } = require('http-errors')
const { STATUS_CODES } = require('http')

function frontendConfig (req, res, next) {
  const frontendConfig = {}
  res.json(Object.assign(frontendConfig, config.frontend))
}

function noCache () {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    next()
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
  const { message, name, stack } = err
  const details = req.app.get('env') !== 'production'
    ? { name, stack }
    : { name }
  let code = 500
  let reason = STATUS_CODES[code]
  if (isHttpError(err)) {
    code = err.statusCode
    reason = STATUS_CODES[code]
  }
  if (code < 100 || code >= 600) {
    code = 500
  }
  const status = code < 400 ? 'Success' : 'Failure'
  if (code >= 500) {
    logger.error(err.message, err.stack)
  }
  return { code, reason, message, status, details }
}

function sendError (err, req, res, next) {
  const locals = errorToLocals(err, req)
  res.status(locals.code).send(locals)
}

function renderError (err, req, res, next) {
  const locals = errorToLocals(err, req)

  res.format({
    json: () => res.status(locals.code).send(locals),
    default: () => res.status(locals.code).send(ErrorTemplate(locals))
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
  <h2><%= code %></h2>
  <% if (details.stack) { %><pre><%= details.stack %></pre><% } %>
</body>
</html>`)

module.exports = {
  frontendConfig,
  noCache,
  historyFallback,
  notFound,
  sendError,
  renderError,
  ErrorTemplate
}
