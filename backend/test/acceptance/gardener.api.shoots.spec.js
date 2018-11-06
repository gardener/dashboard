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
        k8s.stub.getShoot({bearer, namespace, name, createdBy, purpose, kind, profile, region, bindingName: secret})
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
        const deleteAnnotations = {
          'confirmation.garden.sapcloud.io/deletion': 'true'
        }

        oidc.stub.getKeys()
        k8s.stub.deleteShoot({bearer, namespace, name, resourceVersion})
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
        const monitoringUser = 'monitoringFoo'
        const monitoringPassword = 'monitoringFooPwd'
        const seedClusterName = `${region}.${kind}.example.org`
        const shootServerUrl = 'https://seed.foo.bar:443'
        const seedShootIngressDomain = `${name}.${project}.ingress.${seedClusterName}`

        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.getShootInfo({bearer, namespace, name, project, kind, region, seedClusterName, shootServerUrl, shootUser, shootPassword, monitoringUser, monitoringPassword, seedSecretName, seedName})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/shoots/${name}/info`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.own.property('kubeconfig')
            expect(res.body.cluster_username).to.eql(shootUser)
            expect(res.body.cluster_password).to.eql(shootPassword)
            expect(res.body.monitoring_username).to.eql(monitoringUser)
            expect(res.body.monitoring_password).to.eql(monitoringPassword)
            expect(res.body.serverUrl).to.eql(shootServerUrl)
            expect(res.body.seedShootIngressDomain).to.eql(seedShootIngressDomain)
          })
      })

      it('should replace shoot', function () {
        const metadata = {
          annotations: {
            'garden.sapcloud.io/createdBy': 'baz@example.org',
            'garden.sapcloud.io/purpose': 'evaluation'
          },
          labels: {
            foo: 'bar'
          }
        }
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.replaceShoot({bearer, namespace, name, project, createdBy})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/shoots/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({
            metadata,
            spec
          })
          .catch(err => err.response)
          .then(res => {
            const body = res.body
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(body.spec).to.eql(spec)
            const actLabels = body.metadata.labels
            const expLabels = metadata.labels
            expect(actLabels).to.eql(expLabels)
            const actPurpose = body.metadata.annotations['garden.sapcloud.io/purpose']
            const expPurpose = metadata.annotations['garden.sapcloud.io/purpose']
            expect(actPurpose).to.equal(expPurpose)
            const actCreatedBy = body.metadata.annotations['garden.sapcloud.io/createdBy']
            const expCreatedBy = 'bar@example.org'
            expect(actCreatedBy).to.equal(expCreatedBy)
          })
      })

      it('should replace shoot kubernetes version', function () {
        const version = { version: '1.10.1' }
        common.stub.getCloudProfiles(sandbox)
        oidc.stub.getKeys()
        k8s.stub.replaceShootK8sVersion({bearer, namespace, name, project, createdBy})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`)
          .set('authorization', `Bearer ${bearer}`)
          .send({version})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.spec.kubernetes.version).to.eql(version.version)
          })
      })
    })
  })
})
