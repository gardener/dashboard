//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

module.exports = function ({ agent, k8s }) {
  /* eslint no-unused-expressions: 0 */

  it('should return the backend transitive healthz status', async function () {
    k8s.stub.healthz()
    const res = await agent
      .get('/healthz-transitive')

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({ status: 'ok' })
  })

  it('should return the backend healthz status', async function () {
    const res = await agent
      .get('/healthz')

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({ status: 'ok' })
  })
}
