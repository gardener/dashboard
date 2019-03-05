//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

module.exports = function ({ server, sandbox }) {
  /* eslint no-unused-expressions: 0 */
  const auth = nocks.auth
  const k8s = nocks.k8s
  const name = 'bar'
  const username = `${name}@example.org`
  const id = username
  const user = auth.createUser({ id })
  const groups = [ 'system:authenticated', 'employee' ]

  it('should return information about the user', async function () {
    const bearer = await user.bearer
    k8s.stub.getUserInfo({ bearer, username })
    const res = await server
      .get('/api/user')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({
      isAdmin: false,
      canCreateProject: true,
      username,
      groups
    })
  })

  it('should return the bearer token of the user', async function () {
    const bearer = await user.bearer
    const res = await server
      .get('/api/user/token')
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.token).to.equal(bearer)
  })
}
