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

describe('gardener', function () {
  describe('api', function () {
    describe('members', function () {
      /* eslint no-unused-expressions: 0 */
      const oidc = nocks.oidc
      const k8s = nocks.k8s
      const name = 'bar'
      const project = 'foo'
      const namespace = `garden-${project}`
      const members = ['foo@example.org', 'bar@example.org', 'foobar@example.org']
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
        nocks.verify()
        nocks.reset()
      })

      it('should return three project members', function () {
        oidc.stub.getKeys()
        k8s.stub.getMembers({bearer, namespace, members})
        return chai.request(app)
          .get(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
          })
      })

      it('should add a project member', function () {
        const newMember = 'newmember@example.org'
        oidc.stub.getKeys()
        k8s.stub.addMember({bearer, namespace, newMember, members})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, name: newMember})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(4)
          })
      })

      it('should not add member that is already a project member', function () {
        const newMember = 'foo@example.org'
        oidc.stub.getKeys()
        k8s.stub.notAddMember({bearer, namespace, members})
        return chai.request(app)
          .post(`/api/namespaces/${namespace}/members`)
          .set('authorization', `Bearer ${bearer}`)
          .send({metadata, name: newMember})
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(3)
          })
      })

      it('should delete a project member', function () {
        const removeMember = 'bar@example.org'
        oidc.stub.getKeys()
        k8s.stub.removeMember({bearer, namespace, removeMember, members})
        return chai.request(app)
          .delete(`/api/namespaces/${namespace}/members/${removeMember}`)
          .set('authorization', `Bearer ${bearer}`)
          .catch(err => err.response)
          .then(res => {
            expect(res).to.have.status(200)
            expect(res).to.be.json
            expect(res.body).to.have.length(2)
          })
      })
    })
  })
})
