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

const {
  SubjectList,
  ProjectMemberManager
} = require('../lib/services/members')

const _ = require('lodash')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
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
            'garden.sapcloud.io/createdBy': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-user',
          namespace: 'garden-foo',
          annotations: {
            'garden.sapcloud.io/createdBy': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-multiple',
          namespace: 'garden-foo',
          annotations: {
            'garden.sapcloud.io/createdBy': 'foo'
          },
          creationTimestamp: 'bar-time'
        }
      },
      {
        metadata: {
          name: 'robot-nomember',
          namespace: 'garden-foo',
          annotations: {
            'garden.sapcloud.io/createdBy': 'foo'
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
      'core.gardener.cloud': {
        projects: {
          mergePatch: _.noop
        }
      },
      core: {
        serviceaccounts: {
          create: _.noop
        }
      }
    }

    describe('#SubjectList', function () {
      const subjectList = new SubjectList(memberSubjects)

      it('should merge role, roles into roles', async function () {
        const memberRoles = subjectList.get('foo@bar.com').roles
        expect(memberRoles).to.have.length(2)
        expect(memberRoles).to.have.deep.members(['admin', 'owner'])
      })
    })

    describe('#ProjectMemberManager', function () {
      let projectMemberManager

      beforeEach(function () {
        projectMemberManager = new ProjectMemberManager(client, 'creator', project, serviceAccounts)
      })

      it('should merge multiple occurences of same user in members list', async function () {
        // merge all roles
        // do not merge service accounts from different namespaces
        // include no member service accounts
        const frontendMemberList = projectMemberManager.list()

        expect(frontendMemberList).to.have.length(8)
        expect(frontendMemberList).to.deep.contain({ username: 'mutiple@bar.com', roles: ['admin', 'viewer'] })
        expect(frontendMemberList).to.deep.contain({ username: 'system:serviceaccount:garden-foo:robot-multiple', roles: ['otherrole', 'admin', 'myrole', 'viewer'], createdBy: 'foo', creationTimestamp: 'bar-time' })
        expect(frontendMemberList).to.deep.contain({ username: 'system:serviceaccount:garden-foreign:robot-foreign-namespace', roles: ['myrole', 'viewer', 'admin'] })

        expect(frontendMemberList).to.deep.contain({ username: 'system:serviceaccount:garden-foo:robot-nomember', roles: [], createdBy: 'foo', creationTimestamp: 'bar-time' })
      })

      it('should normalize kind service account members subject to kind user with service account prefix and add metadata from service account', async function () {
        const frontendMemberList = projectMemberManager.list()

        expect(frontendMemberList).to.deep.contain({ username: 'system:serviceaccount:garden-foo:robot-sa', roles: ['admin', 'myrole', 'viewer'], createdBy: 'foo', creationTimestamp: 'bar-time' })
      })

      // update unique member
      // update mutiple member, remove + add role, check that minimal changes are applied to multiple accounts, sa members not migrated
      // delete, check that all occurrences are deleted

      it('should add a user to project', async function () {
        const name = 'newuser@bar.com'
        const roles = ['admin', 'viewer', 'myrole']

        await projectMemberManager.create(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
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

        await projectMemberManager.create(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
        const newMemberListItem = memberSubjects.subjectListItems[name]

        expect(newMemberListItem.subject.name).to.eql('newsa')
        expect(newMemberListItem.subject.kind).to.eql('ServiceAccount')
        expect(newMemberListItem.subject.role).to.eql('sa-role')
        expect(newMemberListItem.roles).to.have.deep.members(roles)
      })

      it('should update a project member', async function () {
        const name = 'foo@bar.com'
        const roles = ['role1', 'role2']

        await projectMemberManager.update(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
        const updatedMemberListItem = memberSubjects.subjectListItems[name]

        expect(updatedMemberListItem.subject.name).to.eql(name)
        expect(updatedMemberListItem.subject.kind).to.eql('User')
        expect(updatedMemberListItem.subject.role).to.eql('role1')
        expect(updatedMemberListItem.roles).to.have.deep.members(roles)
      })

      it('should add new roles to first occurrence of user, remove roles of other occurrences that are no longer assigned to member', async function () {
        const name = 'mutiple@bar.com'
        const roles = ['admin', 'newrole']

        await projectMemberManager.update(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
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

        await projectMemberManager.update(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
        const newMemberListItemGroup = memberSubjects.subjectListItems[name]

        const firstUpdatedMemberListItem = newMemberListItemGroup.items[0]
        const secondUpdatedMemberListItem = newMemberListItemGroup.items[1]

        expect(firstUpdatedMemberListItem.subject.role).to.eql('otherrole')
        expect(firstUpdatedMemberListItem.subject.roles).to.be.undefined

        expect(secondUpdatedMemberListItem).to.be.undefined
      })

      it('should not convert a service account kind user to kind serviceaccount', async function () {
        const name = 'system:serviceaccount:garden-foo:robot-user'
        const roles = ['admin', 'viewer']

        await projectMemberManager.update(name, roles) // assign user to project
        const memberSubjects = projectMemberManager.subjectList
        const newMemberListItem = memberSubjects.subjectListItems[name]

        expect(newMemberListItem.subject.name).to.eql(name)
        expect(newMemberListItem.subject.kind).to.eql('User')
        expect(newMemberListItem.subject.role).to.eql('admin')
        expect(newMemberListItem.subject.roles).to.have.deep.members(['viewer'])
        expect(newMemberListItem.roles).to.have.deep.members(roles)
      })
    })
  })
})
