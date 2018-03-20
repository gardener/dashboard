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

const common = require('../support/common')

describe('gardener', function () {
  describe('api', function () {
    describe('shoots', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'bar'
      const project = 'foo'
      const namespace = `garden-${project}`
      const username = `${name}@example.org`
      const purpose = 'fooPurpose'
      const createdBy = username
      const annotations = {
        'garden.sapcloud.io/createdBy': createdBy,
        'garden.sapcloud.io/purpose': purpose
      }
      const email = username
      const bearer = oidc.sign({email})
      const kind = 'infra1'
      const region = 'foo-east'
      const secret = 'fooSecretName'
      const seedName = 'infra1-seed'
      const seedSecretName = `seedsecret-${seedName}`
      const profile = 'infra1-profileName'
      const spec = {
        cloud: {
          profile,
          region,
          seed: seedName,
          secretBindingRef: {
            name: secret,
            namespace
          }
        }
      }
      spec.cloud[kind] = {}
      const resourceVersion = 42
      const sandbox = sinon.sandbox.create()
      let app

      before(function () {
        app = global.createServer()
      })

      after(function () {
        app.close()
      })

      afterEach(function () {
        nocks.verify()
        nocks.reset()
        sandbox.restore()
      })

      it('should return three shoots', function () {
        oidc.stub.getKeys()
        k8s.stub.getShoots({bearer, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/shoots`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.items).to.have.length(3)
          })
      })

      it('should create a shoot', function () {
        const finalizers = ['gardener']
        oidc.stub.getKeys()
        k8s.stub.createShoot({bearer, namespace, name, spec, resourceVersion})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/shoots`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata: {
            name,
            annotations: {
              'garden.sapcloud.io/purpose': purpose
            }
          },
          spec})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, resourceVersion, annotations, finalizers})
            expect(res.body.spec).to.eql(spec)
          })
      })

      it('should return a shoot', function () {
        oidc.stub.getKeys()
        k8s.stub.getShoot({bearer, namespace, name, project, createdBy, purpose, kind, profile, region, bindingName: secret})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/shoots/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, annotations})
            expect(res.body.spec).to.eql(spec)
          })
      })

      it('should delete a shoot', function () {
        const deletionTimestamp = '1970-01-01T00:00:00Z'
        const deleteAnnotations = {
          'action.garden.sapcloud.io/delete': name,
          'confirmation.garden.sapcloud.io/deletionTimestamp': deletionTimestamp
        }

        oidc.stub.getKeys()
        k8s.stub.deleteShoot({bearer, namespace, name, deleteAnnotations, deletionTimestamp, resourceVersion})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/shoots/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({namespace, annotations: deleteAnnotations, resourceVersion})
          })
      })

      it('should return shoot info', function () {
        const shootUser = 'shootFoo'
        const shootPassword = 'shootFooPwd'
        const seedClusterName = `${region}.${kind}.example.org`
        const shootServerUrl = 'https://seed.foo.bar:443'
        const shootIngressDomain = `${name}.${project}.ingress.${seedClusterName}`

        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getShootInfo({bearer, namespace, name, project, kind, region, seedClusterName, shootServerUrl, shootUser, shootPassword, seedSecretName, seedName})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/shoots/${name}/info`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.own.property('kubeconfig')
            expect(res.body.username).to.eql(shootUser)
            expect(res.body.password).to.eql(shootPassword)
            expect(res.body.serverUrl).to.eql(shootServerUrl)
            expect(res.body.shootIngressDomain).to.eql(shootIngressDomain)
          })
      })
    })
  })
})
