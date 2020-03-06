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
      .get(`/api/user/privileges/${namespace}`)
      .set('cookie', await user.cookie)

    console.log(res.body)
    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('resourceRules')
    expect(res.body).to.have.property('nonResourceRules')
    expect(res.body).to.have.property('incomplete')
    expect(res.body.resourceRules.length).to.equal(2)
  })
}
