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

const _ = require('lodash')
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
      const sandbox = sinon.createSandbox()
      let app

      before(function () {
        app = global.createServer()
      })

      after(function () {
        app.close()
      })

      afterEach(function () {
        verifyAndRestore(sandbox)
      })

      it('should return three infrastructure secrets', function () {
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getInfrastructureSecrets({bearer, namespace, empty: false})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
            _.forEach(res.body, secret => {
              expect(secret.quotas).to.have.length(2)
            })
          })
      })

      it('should return no infrastructure secrets', function () {
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getInfrastructureSecrets({bearer, namespace, empty: true})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(0)
          })
      })

      it('should create a infrastructure secret', function () {
        common.stub.getQuotas(sandbox)
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
            expect(res.body.metadata).to.eql({name, resourceVersion, bindingName, bindingNamespace: namespace, cloudProfileName, cloudProviderKind})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
      })

      it('should patch an own infrastructure secret', function () {
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.patchInfrastructureSecret({bearer, namespace, name, bindingName, bindingNamespace: namespace, data, cloudProfileName, resourceVersion})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, bindingName, cloudProfileName, bindingNamespace: namespace, cloudProviderKind, resourceVersion})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
      })

      it('should not patch a shared infrastructure secret', function () {
        const otherNamespace = 'garden-bar'
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.patchSharedInfrastructureSecret({bearer, namespace: otherNamespace, name, bindingName, bindingNamespace: namespace, data, cloudProfileName, resourceVersion})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(405)
          })
      })

      it('should delete an own infrastructure secret', function () {
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecret({bearer, namespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, bindingName, namespace})
          })
      })

      it('should not delete a shared infrastructure secret', function () {
        const otherNamespace = 'garden-bar'
        common.stub.getQuotas(sandbox)
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.deleteSharedInfrastructureSecret({bearer, namespace: otherNamespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(405)
          })
      })

      it('should not delete infrastructure secret if referenced by shoot', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecretReferencedByShoot({bearer, namespace, project, name, bindingName, bindingNamespace: namespace, cloudProfileName, resourceVersion})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(412)
          })
      })
    })
  })
})
