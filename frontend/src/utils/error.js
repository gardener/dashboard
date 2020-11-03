//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

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
  const errorCode = get(err, 'response.data.error.code', get(err, 'response.status'))
  const detailedMessage = get(err, 'response.data.message', 'Request failed with code: ' + errorCode)

  return { errorCode, detailedMessage }
}
