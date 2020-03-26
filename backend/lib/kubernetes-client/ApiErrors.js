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

'use strict'

const { get, includes } = require('lodash')
const { HTTPError } = require('got')
const { TimeoutError } = require('p-timeout')

const RETRY_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'EADDRINUSE',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ENETUNREACH'
]

class StatusError extends Error {
  constructor ({ code, message, reason }) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.reason = reason
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

function getValue (err, key) {
  if (err instanceof StatusError) {
    return get(err, key)
  } else if (err instanceof HTTPError) {
    const value = get(err, ['response', 'body', key])
    switch (key) {
      case 'code':
        return value || get(err, ['response', 'statusCode'])
      case 'reason':
        return value || get(err, ['response', 'statusMessage'])
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
function isTooLargeResourceVersionError (err) {
  return getValue(err, 'reason') === 'Timeout' && getValue(err, 'code') === 504
}

function isRetryError (err) {
  return includes(RETRY_ERROR_CODES, err.code) || isTimeoutError(err)
}

function getRetryAfterSeconds (err) {
  return get(err, 'details.retryAfterSeconds', 1)
}

module.exports = {
  StatusError,
  CacheExpiredError,
  isResourceExpired,
  isGone,
  isExpiredError,
  isTimeoutError,
  isTooLargeResourceVersionError,
  isRetryError,
  getRetryAfterSeconds
}
