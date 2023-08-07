//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

// Lodash
import get from 'lodash/get'

export function isConflict (error) {
  return hasStatusCode(409, error)
}

export function isNotFound (error) {
  return hasStatusCode(404, error)
}

export function isGatewayTimeout (error) {
  return hasStatusCode(504, error)
}

function hasStatusCode (statusCode, err) {
  return get(err, 'response.status') === statusCode
}

export function errorDetailsFromError (err) {
  let errorCode = 'unknown'
  let detailedMessage = 'An unknown error occurred: ' + JSON.stringify(err)

  if (err.name === 'YAMLException') {
    errorCode = 'YAMLException'
    detailedMessage = 'YAML parsing failed with message: ' + err.message
  } else if (err.name === 'FetchError') {
    errorCode = get(err, 'response.data.code', get(err, 'response.status'))
    detailedMessage = get(err, 'response.data.message', 'Request failed with code: ' + errorCode)
  }

  return { errorCode, detailedMessage }
}
