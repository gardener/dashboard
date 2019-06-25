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

const { oidc: { rejectUnauthorized, ca } = {} } = require('../../lib/config')
const security = require('../../lib/security')
const { custom } = require('openid-client')

module.exports = function ({ agent, oidc }) {
  /* eslint no-unused-expressions: 0 */

  it('should return the oidc issuer client', async function () {
    oidc.stub.getIssuerClient()
    const client = await security.getIssuerClient()
    expect(client[custom.http_options]()).to.include({
      followRedirect: false,
      rejectUnauthorized,
      ca
    })
    expect(client[custom.clock_tolerance]).to.equal(42)
  })
}
