//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HOST_PREFIX = '__Host-'

module.exports = {
  GARDENER_AUDIENCE: 'gardener',
  COOKIE_HEADER_PAYLOAD: HOST_PREFIX + 'gHdrPyl',
  COOKIE_SIGNATURE: HOST_PREFIX + 'gSgn',
  COOKIE_TOKEN: HOST_PREFIX + 'gTkn',
  COOKIE_CODE_VERIFIER: HOST_PREFIX + 'gCdVrfr',
  COOKIE_STATE: HOST_PREFIX + 'gStt'
}
