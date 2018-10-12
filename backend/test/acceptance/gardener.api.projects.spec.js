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

describe('gardener', function () {
  describe('api', function () {
    describe('projects', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'foo'
      const namespace = `garden-${name}`
      const metadata = {name}
      const username = `${name}@example.org`
      const email = username
      const bearer = oidc.sign({email})
      const adminBearer = oidc.sign({email: 'admin@example.org'})
      const role = 'project'
      const owner = 'owner'
      const createdBy = 'createdBy'
      const description = 'description'
      const purpose = 'purpose'
      const data = {createdBy, owner, description, purpose}
      let app

      before(function () {
        app = global.createServer()
      })

      after(function () {
        app.close()
      })

      afterEach(function () {
        verifyAndRestore()
      })

      it('should return two projects', function () {
        oidc.stub.getKeys()
        k8s.stub.getProjects({bearer})
        return chai.request(app)
          .get('/api/namespaces')
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(2)
          })
      })

      it('should return all projects', function () {
        oidc.stub.getKeys()
        k8s.stub.getProjects({bearer: adminBearer})
        return chai.request(app)
          .get('/api/namespaces')
          .set('authorization', `Bearer ${adminBearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
          })
      })

      it('should return the foo project', function () {
        const resourceVersion = 42
        oidc.stub.getKeys()
        k8s.stub.getProject({bearer, name, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, resourceVersion, role})
          })
      })

      it.only('should reject request with authorization error', function () {
        const bearer = oidc.sign({email: 'baz@example.org'})
        oidc.stub.getKeys()
        k8s.stub.getProject({bearer, name, namespace, unauthorized: true})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(403)
            expect(res).to.be.json
            expect(res.body.status).to.equal(403)
          })
      })

      it('should create a project', function () {
        const createdBy = username
        const resourceVersion = 42
        oidc.stub.getKeys()
        k8s.stub.createProject({namespace, username, resourceVersion})
        return chai.request(app)
          .post('/api/namespaces')
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, resourceVersion, role})
            expect(res.body.data).to.eql({createdBy, owner, description, purpose})
          })
      })

      it('should patch a project', function () {
        const createdBy = 'bar@example.org'
        const resourceVersion = 43
        oidc.stub.getKeys()
        k8s.stub.patchProject({bearer, namespace, username, resourceVersion})
        return chai.request(app)
          .put(`/api/namespaces/${namespace}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, data})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, resourceVersion, role})
            expect(res.body.data).to.eql({createdBy, owner, description, purpose})
          })
      })

      it('should delete a project', function () {
        oidc.stub.getKeys()
        k8s.stub.deleteProject({bearer, namespace, username})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.metadata).to.eql({name, namespace, role})
          })
      })
    })
  })
})
