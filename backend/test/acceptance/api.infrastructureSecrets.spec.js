// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

const _ = require('lodash')
const common = require('../support/common')
const { cache } = require('../../lib/cache')

module.exports = function ({ agent, sandbox, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const name = 'bar'
  const secretName = `${name}-s`
  const project = 'foo'
  const hasCostObject = true
  const namespace = `garden-${project}`
  const cloudProfileName = 'infra1-profileName'
  const cloudProviderKind = 'infra1'
  const secretRef = {
    name: secretName,
    namespace
  }
  const metadata = { name, namespace, secretRef, cloudProfileName, cloudProviderKind }
  const username = `${name}@example.org`
  const id = username
  const user = auth.createUser({ id })
  const key = 'myKey'
  const secret = 'mySecret'
  const data = { key, secret }
  const resourceVersion = 42

  beforeEach(function () {
    cache.projects.replace(k8s.projectList)
  })

  it('should return three infrastructure secrets', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.getInfrastructureSecrets({ bearer, namespace, empty: false })
    k8s.stub.getCloudProfiles({ bearer, verb: 'list' })
    const res = await agent
      .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(3)
    _.forEach(res.body, secret => {
      expect(secret.metadata).to.have.property('hasCostObject')
      expect(secret.metadata).to.have.property('projectName')
      expect(secret.quotas).to.have.length(2)
    })
  })

  it('should return no infrastructure secrets', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.getInfrastructureSecrets({ bearer, namespace, empty: true })
    k8s.stub.getCloudProfiles({ bearer, verb: 'list' })
    const res = await agent
      .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.length(0)
  })

  it('should create a infrastructure secret', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.createInfrastructureSecret({ bearer, namespace, secretRef, data, cloudProfileName, resourceVersion })
    k8s.stub.getCloudProfiles({ bearer, verb: 'get' })
    const res = await agent
      .post(`/api/namespaces/${namespace}/infrastructure-secrets`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ name, namespace, secretRef, resourceVersion, cloudProfileName, cloudProviderKind, hasCostObject, projectName: project })
    expect(res.body.data).to.have.own.property('key')
    expect(res.body.data).to.have.own.property('secret')
  })

  it('should patch an own infrastructure secret', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.patchInfrastructureSecret({ bearer, name, namespace, secretRef, data, cloudProfileName, resourceVersion })
    k8s.stub.getCloudProfiles({ bearer, verb: 'get' })
    const res = await agent
      .put(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ name, namespace, secretRef, cloudProfileName, cloudProviderKind, resourceVersion, hasCostObject, projectName: project })
    expect(res.body.data).to.have.own.property('key')
    expect(res.body.data).to.have.own.property('secret')
  })

  it('should not patch a shared infrastructure secret', async function () {
    const bearer = await user.bearer
    const otherNamespace = 'garden-bar'
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.patchSharedInfrastructureSecret({ bearer, name, namespace: otherNamespace, secretRef, data, cloudProfileName, resourceVersion })
    const res = await agent
      .put(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(405)
  })

  it('should delete an own infrastructure secret', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.deleteInfrastructureSecret({ bearer, name, namespace, project, secretRef, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ name, namespace, secretRef })
  })

  it('should not delete a shared infrastructure secret', async function () {
    const bearer = await user.bearer
    const otherNamespace = 'garden-bar'
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.deleteSharedInfrastructureSecret({ bearer, name, namespace: otherNamespace, project, secretRef, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(405)
  })

  it('should not delete infrastructure secret if referenced by shoot', async function () {
    const bearer = await user.bearer
    k8s.stub.deleteInfrastructureSecretReferencedByShoot({ bearer, name, namespace, project, secretRef, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(412)
  })
}
