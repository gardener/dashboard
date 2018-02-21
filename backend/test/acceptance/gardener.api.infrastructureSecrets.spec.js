//
// Copyright 2018 by The Gardener Authors.
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

const app = require('../../lib/app')
const common = require('../support/common')

describe('gardener', function () {
  describe('api', function () {
    describe('infrastructureSecrets', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'bar'
      const project = 'foo'
      const namespace = `garden-${project}`
      const bindingName = `${name}-sb`
      const bindingKind = 'PrivateSecretBinding'
      const cloudProfileName = 'infra1-profileName'
      const cloudProviderKind = 'infra1'
      const metadata = {name, bindingName, cloudProfileName}
      const username = `${name}@example.org`
      const email = username
      const bearer = oidc.sign({email})
      const key = 'myKey'
      const secret = 'mySecret'
      const data = {key, secret}
      const resourceVersion = 42
      const sandbox = sinon.sandbox.create()

      afterEach(function () {
        nocks.reset()
        sandbox.restore()
      })

      it('should return three infrastructure secrets', function () {
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getInfrastructureSecrets({bearer, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
          })
          .finally(() => nocks.verify())
      })

      it('should return no infrastructure secrets', function () {
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getNoInfrastructureSecrets({bearer, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(0)
          })
          .finally(() => nocks.verify())
      })

      it('should create a infrastructure secret', function () {
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.createInfrastructureSecret({bearer, namespace, data, cloudProfileName, resourceVersion})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, resourceVersion, bindingName, bindingKind, cloudProfileName, cloudProviderKind})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
          .finally(() => nocks.verify())
      })

      it('should patch a private infrastructure secret', function () {
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.patchInfrastructureSecret({bearer, namespace, name, bindingName, data, cloudProfileName, resourceVersion})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/infrastructure-secrets/private/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, bindingName, bindingKind, cloudProfileName, cloudProviderKind, resourceVersion})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
          .finally(() => nocks.verify())
      })

      it('should not patch a cross infrastructure secret', function () {
        oidc.stub.getKeys()
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/infrastructure-secrets/cross/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(405)
          })
          .finally(() => nocks.verify())
      })

      it('should delete a private infrastructure secret', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecret({bearer, namespace, project, name, bindingName, cloudProfileName, resourceVersion})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/private/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, bindingName, bindingKind, namespace})
          })
          .finally(() => nocks.verify())
      })

      it('should not delete a cross infrastructure secret', function () {
        oidc.stub.getKeys()
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/cross/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(405)
          })
          .finally(() => nocks.verify())
      })

      it('should not delete infrastructure secret if referenced by shoot', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecretReferencedByShoot({bearer, namespace, project, bindingName})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/private/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(412)
          })
          .finally(() => nocks.verify())
      })
    })
  })
})
