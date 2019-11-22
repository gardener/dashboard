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

const common = require('../support/common')

module.exports = function info ({ agent, sandbox, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'admin@example.org'
  const id = username
  const aud = [ 'gardener' ]
  const project = 'foo'
  const namespace = `garden-${project}`

  it.skip('should create a terminal resource', async function () {
    const user = auth.createUser({ id, aud })
    const bearer = await user.bearer
    const target = 'garden'

    common.stub.getCloudProfiles(sandbox)
    k8s.stub.createTerminal({ bearer, namespace, target })
    const res = await agent
      .post(`/api/namespaces/${namespace}/terminals/${target}`)
      .set('cookie', await user.cookie)
      .send({ method: 'create', params: {} })

    expect(res).to.have.status(200)
    expect(res).to.be.json
  })
}
