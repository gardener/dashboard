//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import http2 from 'http2'
import path from 'path'
import _ from 'lodash-es'

const {
  HTTP2_HEADER_CONTENT_TYPE,
} = http2.constants

const PatchType = {
  MERGE: 'merge',
  STRATEGIC_MERGE: 'strategic-merge',
  JSON: 'json',
}

function decodeBase64 (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function setContentType (options, value) {
  return _.set(options, ['headers', HTTP2_HEADER_CONTENT_TYPE], value)
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

function encodeName (name) {
  return Array.isArray(name) ? path.join(...name.map(encodeURIComponent)) : encodeURIComponent(name)
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

export {
  decodeBase64,
  setContentType,
  PatchType,
  setPatchType,
  namespaceScopedUrl,
  clusterScopedUrl,
  validateLabelValue,
}
