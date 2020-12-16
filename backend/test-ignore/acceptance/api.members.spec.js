//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
  const createdBy = `${name}@example.org`
  const creationTimestamp = 'now'
  const user = auth.createUser({ id: createdBy })

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
    expect(res.body).toHaveLength(5)
    expect(res.body).toEqual(members)
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
    expect(res.body.username).toBe(name)
    expect(res.body).toHaveProperty('kubeconfig')
    expect(fromKubeconfig(res.body.kubeconfig)).toHaveProperty('url', 'https://kubernetes.external.foo.bar')
  })

  it('should add a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    const roles = ['admin', 'owner']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ name, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const expectedBody = _.concat(members, { username: name, roles })
    expect(res.body).toEqual(expectedBody)
  })

  it('should not add member that is already a project member', async function () {
    const bearer = await user.bearer
    const name = 'foo@example.org'
    const roles = ['admin']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ name, roles })

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
      .send({ roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const member = _.find(res.body, ['username', name])
    expect(member).toEqual({ username: name, roles })
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
    const expectedBody = _.filter(members, ({ username }) => username !== name)
    expect(res.body).toEqual(expectedBody)
  })

  it('should not delete a member that is not a project member', async function () {
    const bearer = await user.bearer
    const name = 'baz@example.org'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).toEqual(members)
  })

  it('should create a service account without roles', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:foo`
    const roles = []
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ name, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const expectedBody = _.concat(members, {
      username: name,
      roles,
      createdBy,
      creationTimestamp
    })
    expect(res.body).toEqual(expectedBody)
  })

  it('should delete a service account', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const expectedBody = _.filter(members, ({ username }) => username !== name)
    expect(res.body).toEqual(expectedBody)
  })

  it('should add a service account and assign member roles', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:foo`
    const roles = ['myrole']
    const description = 'description'
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ name, roles, description })

    expect(res).to.have.status(200)
    const expectedBody = _.concat(members, {
      username: name,
      roles,
      description,
      createdBy,
      creationTimestamp
    })
    expect(res.body).toEqual(expectedBody)
  })

  it('should not create service account if already exists', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = ['myrole']
    k8s.stub.addMember({ bearer, namespace, name, roles })
    const res = await agent
      .post(`/api/namespaces/${namespace}/members`)
      .set('cookie', await user.cookie)
      .send({ name, roles })

    expect(res).to.have.status(409)
  })

  it('should update roles of existing service account', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = ['myrole']
    const description = 'newDescription'
    k8s.stub.updateMember({ bearer, namespace, name, roles, description })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ roles, description })

    expect(res).to.have.status(200)
    const member = _.find(res.body, ['username', name])
    expect(member).toEqual({ username: name, roles, description })
  })

  it('should add roles to existing service account without roles =>add member', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot-nomember`
    const roles = ['myrole']
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const member = _.find(res.body, ['username', name])
    expect(member).toEqual({ username: name, roles })
  })

  it('should remove all roles of existing service account => delete member', async function () {
    const bearer = await user.bearer
    const name = `system:serviceaccount:${namespace}:robot`
    const roles = []
    k8s.stub.updateMember({ bearer, namespace, name, roles })
    const res = await agent
      .put(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)
      .send({ roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const member = _.find(res.body, ['username', name])
    expect(member).toEqual({ username: name, roles })
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
      .send({ name, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const member = _.find(res.body, ['username', name])
    expect(member).toEqual({ username: name, roles })
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
      .send({ name, roles })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).toEqual(members)
  })

  it('should delete a foreign service account', async function () {
    const bearer = await user.bearer
    const name = 'system:serviceaccount:garden-baz:robot'
    k8s.stub.removeMember({ bearer, namespace, name })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/members/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    const expectedBody = _.filter(members, ({ username }) => username !== name)
    expect(res.body).toEqual(expectedBody)
  })
}
