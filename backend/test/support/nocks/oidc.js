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
