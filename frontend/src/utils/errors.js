//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import statuses from 'statuses'
import toIdentifier from 'toidentifier'

import get from 'lodash/get'

function hasStatusCode (err, statusCode) {
  return err.statusCode === statusCode || err.response?.status === statusCode
}

function setProperties (err, properties = {}) {
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(err, key, { value })
  }
  return err
}

export function createError (name, message, properties) {
  if (typeof message !== 'string') {
    properties = message
    message = name
    name = 'Error'
  }
  const err = new Error(message)
  if (typeof name === 'number') {
    const statusCode = name
    err.statusCode = statusCode
    name = toIdentifier(get(statuses, [message, statusCode], 'http'))
  }
  name = toIdentifier(name)
  if (!name.endsWith('Error')) {
    name += 'Error'
  }
  err.name = name
  return setProperties(err, properties)
}

export function createClockSkewError (message = 'System clocks of server and client are out of sync', ...rest) {
  return createError('ClockSkew', message, ...rest)
}

export function createNoUserError (message = 'User not found', ...rest) {
  return createError('NoUser', message, ...rest)
}

export function createSessionExpiredError (message = 'User session is expired', ...rest) {
  return createError('SessionExpired', message, ...rest)
}

export function createAbortError (message, ...rest) {
  return createError('Abort', message, ...rest)
}

export function isUnauthorizedError (err) {
  return hasStatusCode(err, 401)
}

export function isForbiddenError (err) {
  return hasStatusCode(err, 403)
}

export function isNotFoundError (err) {
  return hasStatusCode(err, 404)
}

export function isConflictError (err) {
  return hasStatusCode(err, 409)
}

export function isGatewayTimeoutError (err) {
  return hasStatusCode(err, 504)
}

export function isTooManyRequestsError (err) {
  return hasStatusCode(err, 429)
}

export function isNoUserError (err) {
  return err.name === 'NoUserError'
}

export function isSessionExpiredError (err) {
  return err.name === 'SessionExpired'
}

export function isClockSkewError (err) {
  return err.name === 'ClockSkewError'
}

export function isAbortError (err) {
  return err.name === 'AbortError'
}
