//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const nock = require('nock')
const { oidc = {} } = require('../../../lib/config')

const stub = {
  getIssuerClient () {
    const issuerUrl = oidc.issuer
    return nock(issuerUrl)
      .get('/.well-known/openid-configuration')
      .reply(200, () => {
        return {
          issuer: issuerUrl,
          authorization_endpoint: `${issuerUrl}/authorize`,
          token_endpoint: `${issuerUrl}/token`,
          jwks_uri: `${issuerUrl}/keys`,
          response_types_supported: [ 'code' ],
          id_token_signing_alg_values_supported: [ 'RS256' ],
          scopes_supported: [ 'openid', 'email', 'profile' ],
          claims_supported: [ 'aud', 'email', 'email_verified', 'exp', 'iat', 'iss', 'name', 'sub' ]
        }
      })
  }
}

module.exports = {
  stub
}
