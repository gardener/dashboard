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

  it('should return all cloudprofiles', async function () {
    const bearer = await user.bearer

    common.stub.getCloudProfiles(sandbox)
    k8s.stub.getCloudProfiles({ bearer, verb: 'list' })

    const res = await agent
      .get('/api/cloudprofiles')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(4)
    let predicate = item => item.metadata.name === 'infra1-profileName'
    expect(_.find(res.body, predicate).data.seedNames).to.have.length(3)
    predicate = item => item.metadata.name === 'infra1-profileName2'
    expect(_.find(res.body, predicate).data.seedNames).to.have.length(2)
    predicate = item => item.metadata.name === 'infra3-profileName'
    expect(_.find(res.body, predicate).data.seedNames).to.have.length(1)
    predicate = item => item.metadata.name === 'infra3-profileName2'
    expect(_.find(res.body, predicate).data.seedNames).to.have.length(2)
  })
}
