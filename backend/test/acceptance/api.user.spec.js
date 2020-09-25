//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { encodeBase64 } = require('../../lib/utils')
const { apiServerUrl, apiServerCaData, oidc = {} } = require('../../lib/config')

module.exports = function ({ agent, sandbox, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const name = 'bar'
  const username = `${name}@example.org`
  const id = username
  const user = auth.createUser({ id })

  it('should return information about the user', async function () {
    const bearer = await user.bearer
    k8s.stub.getPrivileges({ bearer })
    const res = await agent
      .get('/api/user/privileges')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({
      isAdmin: false
    })
  })

  it('should return the bearer token of the user', async function () {
    const bearer = await user.bearer
    const res = await agent
      .get('/api/user/token')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.token).to.equal(bearer)
  })

  it('should return selfsubjectrules for the user', async function () {
    const bearer = await user.bearer
    const project = 'foo'
    const namespace = `garden-${project}`
    k8s.stub.getSelfSubjectRulesReview({ bearer, namespace })
    const res = await agent
      .post('/api/user/subjectrules/')
      .set('cookie', await user.cookie)
      .send({ namespace })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('resourceRules')
    expect(res.body).to.have.property('nonResourceRules')
    expect(res.body).to.have.property('incomplete')
    expect(res.body.resourceRules.length).to.equal(2)
  })

  it('should return the kubeconfig data the user', async function () {
    const bearer = await user.bearer
    const res = await agent
      .get('/api/user/kubeconfig')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({
      server: apiServerUrl,
      certificateAuthorityData: apiServerCaData,
      oidc: {
        issuerUrl: oidc.issuer,
        clientId: oidc.public.clientId,
        clientSecret: oidc.public.clientSecret,
        certificateAuthorityData: encodeBase64(oidc.ca),
        extraScopes: ['email', 'profile', 'groups']
      }
    })
  })
}
