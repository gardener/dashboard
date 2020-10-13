//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const { fromKubeconfig } = require('@gardener-dashboard/kube-config')
const _ = require('lodash')
const { cache } = require('../../lib/cache')

module.exports = function ({ agent, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const name = 'bar'
  const project = 'foo'
  const namespace = `garden-${project}`
  const members = k8s.readProjectMembers(namespace)
  const metadata = {}
  const username = `${name}@example.org`
  const id = username
  const user = auth.createUser({ id })

  beforeEach(function () {
    cache.projects.replace(k8s.projectList)
  })

  it('should return all project members, including service accounts without entry in project', async function () {
    const bearer = await user.bearer
    k8s.stub.getMembers({ bearer, namespace })
    const res = await agent
      .get(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.have.length(4)
      expect(res.body).to.have.deep.members(members)
  })

  it('should not return members but respond "not found"', async function () {
    const bearer = await user.bearer
    const namespace = 'garden-baz'
    k8s.stub.getMembers({ bearer, namespace })
    const res = await agent
      .get(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(404)
    expect(res).to.be.json
    expect(res.body.message).to.match(/not related to a gardener project/i)
  })

  it('should return a service account', async function () {
    const bearer = await user.bearer
    const serviceAccountName = 'robot'
    const name = `system:serviceaccount:${namespace}:${serviceAccountName}`
    k8s.stub.getMember({ bearer, namespace, name })
    const res = await agent
      .get(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.username).to.equal(name)
    expect(res.body).to.have.property('kubeconfig')
    expect(fromKubeconfig(res.body.kubeconfig)).to.have.property('url', 'https://kubernetes.external.foo.bar')
  })

  it('should add a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    const roles = ['admin', 'owner']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.deep.members(_.concat(members, { username: name, roles }))
  })

  it('should not add member that is already a project member', async function () {
    const bearer = await user.bearer
    const name = 'foo@example.org'
    const roles = ['admin']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(409)
  })

  it('should update roles of a project member', async function () {
    const bearer = await user.bearer
    const name = 'bar@example.org'
    const roles = ['newRole']
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const member = _.find(res.body, { username: name })
    expect(member).to.eql({ username: name, roles })
  })

  it('should delete a project member', async function () {
    const bearer = await user.bearer
    const name = 'bar@example.org'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.deep.members(_.filter(members, ({ username }) => username !== name))
  })

  it('should not delete member that is not a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.deep.members(members)
  })

  it('should create a service account without roles', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:foo`
    const roles = []
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(200)
    expect(res.body).to.have.deep.members(_.concat(members, { username: name, roles }))
  })

  it('should add a service account and assign member roles', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:foo`
    const roles = ['myrole']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(200)
  })

  it('should not create service account if already exists', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = ['myrole']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(409)
  })

  it('should update roles of existing service account', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = ['myrole']
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, roles })
    expect(res).to.have.status(200)
  })

  it('should add roles to existing service account without roles =>add member', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot-nomember`
    const roles = ['myrole']
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, roles })
    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.deep.contain({ username: name, roles })
  })

  it('should remove all roles of existing service account =>delete member', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = []
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, roles })
    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.deep.contain({ username: name, roles })
  })

  it('should add a foreign service account as member to project', async function () {
    const bearer = await user.bearer
    const foreignNamespace = 'othernamespace'
    const name = `system:serviceaccount:${foreignNamespace}:fsa`
    const roles = ['myrole']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.deep.contain({ username: name, roles })
  })

  it('should not add a foreign service account without roles as member to project', async function () {
    const bearer = await user.bearer
    const foreignNamespace = 'othernamespace'
    const name = `system:serviceaccount:${foreignNamespace}:fsa-noroles`
    const roles = []
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ metadata, name, roles })
    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.not.deep.contain({ username: name, roles })
  })
}
