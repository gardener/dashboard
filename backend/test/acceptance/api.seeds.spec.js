//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const common = require('../support/common')

module.exports = function ({ agent, sandbox, auth, k8s }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'john.doe@example.org'
  const id = username
  const user = auth.createUser({ id })

  it('should return all seeds', async function () {
    const bearer = await user.bearer

    common.stub.getSeeds(sandbox)
    k8s.stub.getSeeds({ bearer })
    const res = await agent
      .get('/api/seeds')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(8)
    let predicate = item => item.metadata.name === 'infra1-seed'
    expect(_.find(res.body, predicate).metadata.unreachable).to.be.false
    predicate = item => item.metadata.name === 'infra3-seed'
    expect(_.find(res.body, predicate).metadata.unreachable).to.be.true
  })
}
