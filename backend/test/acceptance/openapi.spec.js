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
    const shootDefinition = res.body['com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot']
    expect(shootDefinition).to.have.property('spec').that.is.eql({ type: 'object' })
  })
}
