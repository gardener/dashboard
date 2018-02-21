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

describe('gardener', function () {
  describe('api', function () {
    describe('infrastructureSecrets', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'bar'
      const project = 'foo'
      const namespace = `garden-${project}`
      const kind = 'infra1'
      const infrastructure = { kind }
      const metadata = {name, infrastructure}
      const username = `${name}@example.org`
      const email = username
      const bearer = oidc.sign({email})
      const role = 'infrastructure'
      const key = 'myKey'
      const secret = 'mySecret'
      const data = {key, secret}

      afterEach(function () {
        nocks.verify()
        nocks.reset()
      })

      it('should return three infrastructure secrets', function () {
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
      })

      it('should create a infrastructure secret', function () {
        const resourceVersion = 42
        oidc.stub.getKeys()
        k8s.stub.createInfrastructureSecret({bearer, namespace, kind, data, resourceVersion})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/infrastructure-secrets`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, resourceVersion, role, infrastructure})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
      })

      it('should return infrastructure secret', function () {
        oidc.stub.getKeys()
        k8s.stub.getInfrastructureSecret({bearer, namespace, name, project, kind, data})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, role, infrastructure})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
      })

      it('should patch a secret', function () {
        oidc.stub.getKeys()
        k8s.stub.patchInfrastructureSecret({bearer, namespace, name, project, kind, data})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, role, infrastructure})
            expect(res.body.data).to.have.own.property('key')
            expect(res.body.data).to.have.own.property('secret')
          })
      })

      it('should delete a infrastructure secret', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecret({bearer, namespace, project, name})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace})
          })
      })

      it('should not delete infrastructure secret if referenced by shoot', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteInfrastructureSecretReferencedByShoot({bearer, namespace, project, infrastructureSecretName: name})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(412)
          })
      })
    })
  })
})
