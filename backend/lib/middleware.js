//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const logger = require('./logger')
const markdown = require('./markdown')
const { NotFound, InternalServerError, isHttpError } = require('http-errors')
const { STATUS_CODES } = require('http')

function frontendConfig (config) {
  const converter = markdown.createConverter()
  const convertAndSanitize = (obj, key) => {
    if (obj[key]) {
      obj[key] = converter.makeSanitizedHtml(obj[key])
    }
  }

  const frontendConfig = _.cloneDeep(config.frontend)
  const {
    alert = {},
    costObject = {},
    sla = {},
    addonDefinition = {},
    accessRestriction: {
      items = []
    } = {}
  } = frontendConfig

  convertAndSanitize(alert, 'message')
  convertAndSanitize(costObject, 'description')
  convertAndSanitize(sla, 'description')
  convertAndSanitize(addonDefinition, 'description')

  for (const item of items) {
    const {
      display = {},
      input = {},
      options = []
    } = item
    convertAndSanitize(display, 'title')
    convertAndSanitize(display, 'description')
    convertAndSanitize(input, 'title')
    convertAndSanitize(input, 'description')
    for (const option of options) {
      const {
        display = {},
        input = {}
      } = option
      convertAndSanitize(display, 'title')
      convertAndSanitize(display, 'description')
      convertAndSanitize(input, 'title')
      convertAndSanitize(input, 'description')
    }
  }

  return (req, res, next) => {
    res.json(frontendConfig)
  }
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
