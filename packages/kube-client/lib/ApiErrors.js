//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get, includes } = require('lodash')
const { isHttpError } = require('http-errors')
const { TimeoutError } = require('p-timeout')

const CONNECTION_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNREFUSED'
]

class StatusError extends Error {
  constructor ({ code, message, reason, details }) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.reason = reason
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

class CacheExpiredError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.code = 410
    this.reason = 'Expired'
    Error.captureStackTrace(this, this.constructor)
  }
}

function getValue (err, keyPath) {
  if (err instanceof StatusError) {
    return get(err, keyPath)
  } else if (isHttpError(err)) {
    const value = get(err.body, keyPath)
    switch (keyPath) {
      case 'code':
        return value || err.statusCode
      default:
        return value
    }
  }
}

function isResourceExpired (err) {
  return getValue(err, 'reason') === 'Expired'
}

function isGone (err) {
  return getValue(err, 'code') === 410
}

function isExpiredError (err) {
  return isResourceExpired(err) || isGone(err)
}

function isTimeoutError (err) {
  return err instanceof TimeoutError
}

/*
  In case of multiple apiserver instances the largest resourceVersion of watch caches
  will not be in sync anymore. This could lead to situations where we try to start a watch
  with a resourceVersion that is higher than the largest resourceVersion of particular watch cache.
  The apiserver will throw a TooLargeResourceVersionError in this case.
  https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/storage/cacher/watch_cache.go#L338-L344
*/
function hasStatusCauseResourceVersionTooLarge (err) {
  const causes = getValue(err, 'details.causes')
  if (Array.isArray(causes)) {
    for (const { reason, message } of causes) {
      if (reason === 'ResourceVersionTooLarge' || message === 'Too large resource version') {
        return true
      }
    }
  }
  return false
}

function isGatewayTimeout (err) {
  return getValue(err, 'reason') === 'Timeout' && getValue(err, 'code') === 504
}

function isTooLargeResourceVersionError (err) {
  return hasStatusCauseResourceVersionTooLarge(err) || isGatewayTimeout(err)
}

function isConnectionRefused (err) {
  return includes(CONNECTION_ERROR_CODES, err.code) || isTimeoutError(err)
}

module.exports = {
  StatusError,
  CacheExpiredError,
  isResourceExpired,
  isGone,
  isExpiredError,
  isTimeoutError,
  isTooLargeResourceVersionError,
  isGatewayTimeout,
  hasStatusCauseResourceVersionTooLarge,
  isConnectionRefused
}
