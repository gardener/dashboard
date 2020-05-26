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

const path = require('path')
const { HTTPError } = require('got')

const { encodeBase64 } = require('../utils')

const PatchType = {
  MERGE: 'merge',
  STRATEGIC_MERGE: 'strategic-merge',
  JSON: 'json'
}

function setHeader (options, key, value) {
  if (!options.headers) {
    options.headers = {}
  }
  options.headers[key] = value
  return options
}

function setAuthorization (options, type, credentials) {
  type = type.toLowerCase()
  switch (type) {
    case 'basic':
      return setHeader(options, 'authorization', `Basic ${encodeBase64(credentials)}`)
    case 'bearer':
      return setHeader(options, 'authorization', `Bearer ${credentials}`)
    default:
      throw new TypeError('The authentication type must be one of ["basic", "bearer"]')
  }
}

function setContentType (options, value) {
  return setHeader(options, 'Content-Type', value)
}

function setPatchType (options, type = PatchType.MERGE) {
  switch (type) {
    case PatchType.MERGE:
      return setContentType(options, 'application/merge-patch+json')
    case PatchType.STRATEGIC_MERGE:
      return setContentType(options, 'application/strategic-merge-patch+json')
    case PatchType.JSON:
      return setContentType(options, 'application/json-patch+json')
    default:
      throw new TypeError('The patch type must be one of ["merge", "strategic-merge", "json"]')
  }
}

function isHttpError (err, expectedStatusCode) {
  if (!(err instanceof HTTPError || err.name === 'HTTPError')) {
    return false
  }
  if (expectedStatusCode) {
    const { statusCode } = err.response || {}
    if (Array.isArray(expectedStatusCode)) {
      return expectedStatusCode.indexOf(statusCode) !== -1
    }
    return expectedStatusCode === statusCode
  }
  return true
}

function patchHttpErrorMessage (err) {
  if (err instanceof HTTPError) {
    const { response = {} } = err
    if (response.body) {
      err.message = response.body.message || response.body
    }
  }
  return err
}

function encodeName (name) {
  return Array.isArray(name) ? path.join(name.map(encodeURIComponent)) : encodeURIComponent(name)
}

function encodeNamespace (namespace) {
  return encodeURIComponent(namespace)
}

function namespaceScopedUrl ({ plural }, namespace, name) {
  if (name) {
    return path.join('namespaces', encodeNamespace(namespace), plural, encodeName(name))
  } else if (namespace) {
    return path.join('namespaces', encodeNamespace(namespace), plural)
  }
  return plural
}

function clusterScopedUrl ({ plural }, name) {
  if (name) {
    return path.join(plural, encodeName(name))
  }
  return plural
}

function validateLabelValue (name) {
  if (name && !/^[a-z0-9A-Z][a-z0-9A-Z_.-]*[a-z0-9A-Z]$/.test(name)) {
    throw new TypeError('Label values must be empty or begin and end with an alphanumeric character with dashes, underscores, dots and alphanumerics between')
  }
}

exports = module.exports = {
  setHeader,
  setAuthorization,
  setContentType,
  PatchType,
  setPatchType,
  namespaceScopedUrl,
  clusterScopedUrl,
  validateLabelValue,
  isHttpError,
  patchHttpErrorMessage
}
