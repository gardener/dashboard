//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const delay = require('delay')
const _ = require('lodash')
const { UnprocessableEntity, NotFound } = require('http-errors')
const MemberManager = require('../lib/services/members/MemberManager')
const SubjectList = require('../lib/services/members/SubjectList')

const { expect } = require('chai')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('members', function () {
    const memberSubjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'foo@bar.com',
        role: 'admin',
        roles: [
          'owner'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'mutiple@bar.com',
        role: 'admin'
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-sa',
        namespace: 'garden-foo',
        role: 'admin',
        roles: [
          'myrole',
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'mutiple@bar.com',
        role: 'admin',
        roles: [
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot-user',
        role: 'admin'
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foo:robot-multiple',
        role: 'otherrole'
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-multiple',
        namespace: 'garden-foo',
        role: 'admin',
        roles: [
          'myrole'
        ]
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-multiple',
        namespace: 'garden-foo',
        role: 'myrole',
        roles: [
          'viewer'
        ]
      },
      {
        kind: 'ServiceAccount',
        name: 'robot-foreign-namespace',
        namespace: 'garden-foreign',
        role: 'myrole',
        roles: [
          'viewer'
        ]
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-foreign:robot-foreign-namespace',
        role: 'admin'
      },
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'system:serviceaccount:garden-other-foreign:robot-other-foreign-namespace',
        role: 'otherrole'
      }
    ]

    const serviceAccounts = [
      {
        metadata: {
          name: 'robot-sa',
          namespace: 'garden-foo',
          annotations: {
            'dashboard.gardener.cloud/created-by': 'foo',
            'dashboard.gardener.cloud/description': 'description'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-user',
          namespace: 'garden-foo',
          annotations: {
            'dashboard.gardener.cloud/created-by': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-multiple',
          namespace: 'garden-foo',
          annotations: {
            'dashboard.gardener.cloud/created-by': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-nomember',
          namespace: 'garden-foo',
          annotations: {
            'dashboard.gardener.cloud/created-by': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      }
    ]

    const project = {
      spec: {
        members: memberSubjects,
        namespace: 'garden-foo'
      },
      metadata: {
        name: 'foo'
      }
    }

    const client = {
      'core.gardener.cloud': {},
      core: {}
    }

    beforeEach(function () {
      client['core.gardener.cloud'].projects = {
        mergePatch: sandbox.stub().callsFake(async (name, body) => {
          await delay(1)
        })
      }
      client.core.serviceaccounts = {
        create: sandbox.stub().callsFake(async (namespace, body) => {
          await delay(1)
          _.set(body, 'metadata.creationTimestamp', 'now')
          return body
        }),
        delete: sandbox.stub().callsFake(async (namespace, name) => {
          await delay(1)
        }),
        mergePatch: sandbox.stub().callsFake(async (namespace, name, body) => {
          await delay(1)
        })
      }
    })

    describe('SubjectList', function () {
      const subjectList = new SubjectList(memberSubjects)

      describe('#get', function () {
        it('should merge role, roles into roles', async function () {
          const memberRoles = subjectList.get('foo@bar.com').roles
          expect(memberRoles).to.have.length(2)
          expect(memberRoles).to.have.deep.members(['admin', 'owner'])
        })
      })

      describe('#has', function () {
        it('should merge role, roles into roles', async function () {
          expect(subjectList.has('foo@bar.com')).to.be.true
          expect(subjectList.has('foo@baz.com')).to.be.false
        })
      })
    })

    describe('MemberManager', function () {
      let memberManager

      beforeEach(function () {
        memberManager = new MemberManager(client, 'creator', project, serviceAccounts)
      })

      describe('#list', function () {
        // merge all roles
        // do not merge service accounts from different namespaces
        // include no member service accounts
        it('should merge multiple occurences of same user in members list', async function () {
          const frontendMemberList = memberManager.list()

          expect(frontendMemberList).to.have.length(8)
          expect(frontendMemberList).to.deep.contain({
            username: 'mutiple@bar.com',
            roles: ['admin', 'viewer']
          })
          expect(frontendMemberList).to.deep.contain({
            username: 'system:serviceaccount:garden-foo:robot-multiple',
            roles: ['otherrole', 'admin', 'myrole', 'viewer'],
            createdBy: 'foo',
            creationTimestamp: 'bar-time',
            description: undefined
          })
          expect(frontendMemberList).to.deep.contain({
            username: 'system:serviceaccount:garden-foreign:robot-foreign-namespace',
            roles: ['myrole', 'viewer', 'admin']
          })
          expect(frontendMemberList).to.deep.contain({
            username: 'system:serviceaccount:garden-foo:robot-nomember',
            roles: [],
            createdBy: 'foo',
            creationTimestamp: 'bar-time',
            description: undefined
          })
        })

        it('should normalize kind service account members subject to kind user with service account prefix and add metadata from service account', async function () {
          const frontendMemberList = memberManager.list()

          expect(frontendMemberList).to.deep.contain({
            username: 'system:serviceaccount:garden-foo:robot-sa',
            roles: ['admin', 'myrole', 'viewer'],
            createdBy: 'foo',
            creationTimestamp: 'bar-time',
            description: 'description'
          })
        })
      })

      describe('#get', function () {
        it('should throw NotFound', async function () {
          try {
            await memberManager.get('john.doe@baz.com')
            expect.fail('should throw an error')
          } catch (err) {
            expect(err).to.be.instanceof(NotFound)
          }
        })
      })

      describe('#create', function () {
      // update unique member
      // update mutiple member, remove + add role, check that minimal changes are applied to multiple accounts, sa members not migrated
      // delete, check that all occurrences are deleted
        it('should add a user to project', async function () {
          const name = 'newuser@bar.com'
          const roles = ['admin', 'viewer', 'myrole']

          await memberManager.create(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItem = memberSubjects.subjectListItems[name]

          expect(newMemberListItem.subject.name).to.eql(name)
          expect(newMemberListItem.subject.kind).to.eql('User')
          expect(newMemberListItem.subject.role).to.eql('admin')
          expect(newMemberListItem.subject.roles).to.have.deep.members(['viewer', 'myrole'])
          expect(newMemberListItem.roles).to.have.deep.members(roles)
        })

        it('should add a service account to project', async function () {
          const name = 'system:serviceaccount:garden-foo:newsa'
          const roles = ['sa-role']

          await memberManager.create(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItem = memberSubjects.subjectListItems[name]

          expect(newMemberListItem.subject.name).to.eql('newsa')
          expect(newMemberListItem.subject.kind).to.eql('ServiceAccount')
          expect(newMemberListItem.subject.role).to.eql('sa-role')
          expect(newMemberListItem.roles).to.have.deep.members(roles)
        })
      })

      describe('#update', function () {
        it('should throw NotFound', async function () {
          try {
            await memberManager.update('john.doe@baz.com', {})
            expect.fail('should throw an error')
          } catch (err) {
            expect(err).to.be.instanceof(NotFound)
          }
        })

        it('should update a project member', async function () {
          const name = 'foo@bar.com'
          const roles = ['role1', 'role2']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const updatedMemberListItem = memberSubjects.subjectListItems[name]

          expect(updatedMemberListItem.subject.name).to.eql(name)
          expect(updatedMemberListItem.subject.kind).to.eql('User')
          expect(updatedMemberListItem.subject.role).to.eql('role1')
          expect(updatedMemberListItem.roles).to.have.deep.members(roles)
        })

        it('should add new roles to first occurrence of user, remove roles of other occurrences that are no longer assigned to member', async function () {
          const name = 'mutiple@bar.com'
          const roles = ['admin', 'newrole']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItemGroup = memberSubjects.subjectListItems[name]

          const firstUpdatedMemberListItem = newMemberListItemGroup.items[0]
          const secondUpdatedMemberListItem = newMemberListItemGroup.items[1]

          expect(firstUpdatedMemberListItem.subject.role).to.eql('admin')
          expect(firstUpdatedMemberListItem.subject.roles).to.have.deep.members(['newrole'])

          expect(secondUpdatedMemberListItem.subject.role).to.eql('admin')
          expect(secondUpdatedMemberListItem.subject.roles).to.be.undefined
        })

        it('should remove member occurrences without roles', async function () {
          const name = 'mutiple@bar.com'
          const roles = ['otherrole']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItemGroup = memberSubjects.subjectListItems[name]

          const firstUpdatedMemberListItem = newMemberListItemGroup.items[0]
          const secondUpdatedMemberListItem = newMemberListItemGroup.items[1]

          expect(firstUpdatedMemberListItem.subject.role).to.eql('otherrole')
          expect(firstUpdatedMemberListItem.subject.roles).to.be.undefined

          expect(secondUpdatedMemberListItem).to.be.undefined
        })

        it('should throw an error when trying to remove all roles with update', async function () {
          const name = 'foo@bar.com'
          const roles = []
          try {
            await memberManager.update(name, { roles })
            expect.fail('should throw an error')
          } catch (err) {
            expect(err).to.be.instanceof(UnprocessableEntity)
          }
        })

        it('should not convert a service account kind user to kind serviceaccount', async function () {
          const name = 'system:serviceaccount:garden-foo:robot-user'
          const roles = ['admin', 'viewer']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItem = memberSubjects.subjectListItems[name]

          expect(newMemberListItem.subject.name).to.eql(name)
          expect(newMemberListItem.subject.kind).to.eql('User')
          expect(newMemberListItem.subject.role).to.eql('admin')
          expect(newMemberListItem.subject.roles).to.have.deep.members(['viewer'])
          expect(newMemberListItem.roles).to.have.deep.members(roles)
        })
      })

      describe('#deleteServiceAccount', function () {
        it('should not delete a serviceaccount from a different namespace', async function () {
          const id = 'system:serviceaccount:garden-foreign:robot-foreign-namespace'
          const item = memberManager.subjectList.get(id)
          await memberManager.deleteServiceAccount(item)
          expect(client.core.serviceaccounts.delete).to.not.have.been.called
        })
      })

      describe('#updateServiceAccount ', function () {
        it('should not delete a serviceaccount from a different namespace', async function () {
          const id = 'system:serviceaccount:garden-foreign:robot-foreign-namespace'
          const item = memberManager.subjectList.get(id)
          await memberManager.updateServiceAccount(item, {})
          expect(client.core.serviceaccounts.mergePatch).to.not.have.been.called
        })
      })
    })
  })
})
