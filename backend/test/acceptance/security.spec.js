//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
