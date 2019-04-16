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

const k8s = nocks.k8s

module.exports = function ({ agent }) {
  /* eslint no-unused-expressions: 0 */

  it('should return the backend healthz status', async function () {
    k8s.stub.healthz()
    const res = await agent
      .get('/healthz')

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql({ status: 'ok' })
  })
}
