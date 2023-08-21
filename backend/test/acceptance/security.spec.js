//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const security = require('../../lib/security')

describe('security', function () {
  const { rejectUnauthorized, ca } = fixtures.config.get().oidc

  it('should return the oidc issuer client', async function () {
    const client = await security.getIssuerClient()
    const { custom } = require('openid-client')
    expect(client[custom.http_options]()).toMatchObject({
      followRedirect: false,
      rejectUnauthorized,
      ca
    })
    expect(client[custom.clock_tolerance]).toBe(42)
  })
})
