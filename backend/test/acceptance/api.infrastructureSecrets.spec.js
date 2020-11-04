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
  const project = 'foo'
  const hasCostObject = true
  const namespace = `garden-${project}`
  const bindingName = `${name}-sb`
  const cloudProfileName = 'infra1-profileName'
  const cloudProviderKind = 'infra1'
  const metadata = { namespace, name, bindingName, cloudProfileName, cloudProviderKind }
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
    k8s.stub.createInfrastructureSecret({ bearer, namespace, data, cloudProfileName, resourceVersion })
    k8s.stub.getCloudProfiles({ bearer, verb: 'get' })
    const res = await agent
      .post(`/api/namespaces/${namespace}/infrastructure-secrets`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ secretName: name, secretNamespace: namespace, resourceVersion, bindingName, bindingNamespace: namespace, cloudProfileName, cloudProviderKind, hasCostObject, projectName: project })
    expect(res.body.data).to.have.own.property('key')
    expect(res.body.data).to.have.own.property('secret')
  })

  it('should patch an own infrastructure secret', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.patchInfrastructureSecret({ bearer, namespace, name, bindingName, bindingNamespace: namespace, data, cloudProfileName, resourceVersion })
    k8s.stub.getCloudProfiles({ bearer, verb: 'get' })
    const res = await agent
      .put(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ secretName: name, secretNamespace: namespace, bindingName, cloudProfileName, bindingNamespace: namespace, cloudProviderKind, resourceVersion, hasCostObject, projectName: project })
    expect(res.body.data).to.have.own.property('key')
    expect(res.body.data).to.have.own.property('secret')
  })

  it('should not patch a shared infrastructure secret', async function () {
    const bearer = await user.bearer
    const otherNamespace = 'garden-bar'
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.patchSharedInfrastructureSecret({ bearer, namespace: otherNamespace, name, bindingName, bindingNamespace: namespace, data, cloudProfileName, resourceVersion })
    const res = await agent
      .put(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
      .set('cookie', await user.cookie)
      .send({ metadata, data })

    expect(res).to.have.status(405)
  })

  it('should delete an own infrastructure secret', async function () {
    const bearer = await user.bearer
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.deleteInfrastructureSecret({ bearer, namespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body.metadata).to.eql({ name, bindingName, namespace })
  })

  it('should not delete a shared infrastructure secret', async function () {
    const bearer = await user.bearer
    const otherNamespace = 'garden-bar'
    common.stub.getQuotas(sandbox)
    common.stub.getCloudProfiles(sandbox)
    k8s.stub.deleteSharedInfrastructureSecret({ bearer, namespace: otherNamespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(405)
  })

  it('should not delete infrastructure secret if referenced by shoot', async function () {
    const bearer = await user.bearer
    k8s.stub.deleteInfrastructureSecretReferencedByShoot({ bearer, namespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion })
    const res = await agent
      .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
      .set('cookie', await user.cookie)

    expect(res).to.have.status(412)
  })
}
