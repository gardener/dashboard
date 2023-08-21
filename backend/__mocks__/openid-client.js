// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const originalOpenidClient = jest.requireActual('openid-client')
const { Issuer } = originalOpenidClient

Issuer.discover = jest.fn(issuer => {
  return Promise.resolve(new Issuer({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/keys`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'implicit'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'email', 'profile'],
    claims_supported: ['aud', 'email', 'email_verified', 'exp', 'iat', 'iss', 'name', 'sub'],
    claims_parameter_supported: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: true,
    require_request_uri_registration: false,
    response_modes_supported: ['query', 'fragment'],
    token_endpoint_auth_methods_supported: ['client_secret_basic']
  }))
})

module.exports = originalOpenidClient
