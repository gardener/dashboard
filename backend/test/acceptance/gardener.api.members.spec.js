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

const _ = require('lodash')

describe('gardener', function () {
  describe('api', function () {
    describe('members', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'bar'
      const project = 'foo'
      const namespace = `garden-${project}`
      const members = _
        .chain(k8s.projectMembersList)
        .find(['metadata.namespace', namespace])
        .get('subjects', [])
        .map('name')
        .value()
      const metadata = {}
      const username = `${name}@example.org`
      const email = username
      const bearer = oidc.sign({email})
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

      it('should return two project members', function () {
        oidc.stub.getKeys()
        k8s.stub.getMembers({bearer, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.eql(members)
          })
      })

      it('should return empty member list', function () {
        const namespace = 'garden-baz'
        oidc.stub.getKeys()
        k8s.stub.getMembers({bearer, namespace})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.eql([])
          })
      })

      it('should return a service account', function () {
        const serviceAccountName = 'robot-foo'
        const name = `system:serviceaccount:${namespace}:${serviceAccountName}`
        oidc.stub.getKeys()
        k8s.stub.getMember({bearer, namespace, name})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/members/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, name})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body.name).to.equal(name)
            expect(res.body.kind).to.equal('ServiceAccount')
            expect(res.body).to.have.property('kubeconfig')
          })
      })

      it('should add a project member', function () {
        const name = 'baz@example.org'
        oidc.stub.getKeys()
        k8s.stub.addMember({bearer, namespace, name})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, name})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.eql(_.concat(members, 'baz@example.org'))
          })
      })

      it('should not add member that is already a project member', function () {
        const name = 'foo@example.org'
        oidc.stub.getKeys()
        k8s.stub.addMember({bearer, namespace, name})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, name})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(409)
          })
      })

      it('should delete a project member', function () {
        const name = 'bar@example.org'
        oidc.stub.getKeys()
        k8s.stub.removeMember({bearer, namespace, name})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/members/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.eql(_.without(members, name))
          })
      })

      it('should not delete member that is not a project member', function () {
        const name = 'baz@example.org'
        oidc.stub.getKeys()
        k8s.stub.removeMember({bearer, namespace, name})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/members/${name}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.eql(members)
          })
      })
    })
  })
})
