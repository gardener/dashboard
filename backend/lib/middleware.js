//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import logger from './logger/index.js'
import morgan from 'morgan'
import httpErrors from 'http-errors'
import { STATUS_CODES } from 'http'

const { NotFound, InternalServerError, isHttpError } = httpErrors

const SENSITIVE_PARAMS = [
  'code',
  'state',
]
morgan.token('url', (req, res) => {
  const reqUrl = req.originalUrl || req.url
  try {
    // It's sufficient to use any valid base URL, since we only need a placeholder to correctly parse the path and query parameters.
    // We don't actually rely on or need the real domain for logging purposes.
    const safeBase = 'https://localhost'
    const url = new URL(reqUrl, safeBase)

    const searchParams = url.searchParams
    for (const param of SENSITIVE_PARAMS) {
      if (!searchParams.has(param)) {
        continue
      }
      searchParams.set(param, 'REDACTED')
    }

    return url.pathname + url.search
  } catch (err) {
    return reqUrl
  }
})

const requestLogger = morgan('common', logger)

function noCache (staticPaths = []) {
  const isStatic = path => {
    for (const staticPath of staticPaths) {
      if (path.startsWith(staticPath)) {
        return true
      }
    }
    return false
  }
  return (req, res, next) => {
    if (!isStatic(req.path)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    }
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
  let reason = _.get(STATUS_CODES, [code])
  if (isHttpError(err)) {
    code = err.statusCode
    reason = _.get(STATUS_CODES, [code])
  }
  if (code < 100 || code >= 600) {
    code = 500
  }
  const status = code < 400 ? 'Success' : 'Failure'
  if (code >= 500) {
    logger.error(err.message, err.stack)
  }
  if (code === 401) {
    logger.warn('Authentication failed: %s - %s', err.name, err.message)
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
    default: () => res.status(locals.code).send(ErrorTemplate(locals)),
  })
}

function metricsRoute (prefix) {
  return (req, res, next) => {
    const path = req.route?.path ?? ''
    req.metricsRoute = prefix + path
    next()
  }
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

export {
  noCache,
  historyFallback,
  requestLogger,
  notFound,
  sendError,
  renderError,
  metricsRoute,
  ErrorTemplate,
}
