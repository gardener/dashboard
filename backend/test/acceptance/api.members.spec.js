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

const _ = require('lodash')

module.exports = function ({ server }) {
  /* eslint no-unused-expressions: 0 */
  const auth = nocks.auth
  const k8s = nocks.k8s
  const name = 'bar'
  const project = 'foo'
  const namespace = `garden-${project}`
  const members = k8s.readProjectMembers(namespace)
  const metadata = {}
  const username = `${name}@example.org`
  const id = username
  const user = auth.createUser({ id })

  it('should return two project members', async function () {
    const bearer = await user.bearer
    k8s.stub.getMembers({ bearer, namespace })
    const res = await server
      .get(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql(members)
  })

  it('should not return members but respond "Namespace not found"', async function () {
    const bearer = await user.bearer
    const namespace = 'garden-baz'
    k8s.stub.getMembers({ bearer, namespace })
    const res = await server
      .get(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(404)
    expect(res).to.be.json
    expect(res.body.message).to.equal('Namespace not found')
  })

  it('should return a service account', async function () {
    const bearer = await user.bearer
    const serviceAccountName = 'robot'
    const name = `system:serviceaccount:${namespace}:${serviceAccountName}`
    k8s.stub.getMember({ bearer, namespace, name })
    const res = await server
      .get(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.name).to.equal(name)
    expect(res.body.kind).to.equal('ServiceAccount')
    expect(res.body).to.have.property('kubeconfig')
  })

  it('should add a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    k8s.stub.addMember({ bearer, namespace, name })
    const res = await server
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql(_.concat(members, 'baz@example.org'))
  })

  it('should not add member that is already a project member', async function () {
    const bearer = await user.bearer
    const name = 'foo@example.org'
    k8s.stub.addMember({ bearer, namespace, name })
    const res = await server
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name })
    expect(res).to.have.status(409)
  })

  it('should delete a project member', async function () {
    const bearer = await user.bearer
    const name = 'bar@example.org'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await server
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql(_.without(members, name))
  })

  it('should not delete member that is not a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await server
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql(members)
  })
}
