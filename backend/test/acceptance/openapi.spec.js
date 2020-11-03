//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'
const SwaggerParser = require('swagger-parser')

module.exports = function ({ agent, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'john.doe@example.org'
  const id = username
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  it('should fetch shoot openapi schema', async function () {
    const user = auth.createUser({ id })
    const bearer = await user.bearer
    k8s.stub.getShootDefinition(bearer)
    sandbox.stub(SwaggerParser, 'dereference').callsFake((obj) => {
      return obj
    })
    const res = await agent
      .get('/api/openapi')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot').that.is.eql({ type: 'object' })
  })
}
