//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { UnprocessableEntity, NotFound } = require('http-errors')
const createError = require('http-errors')
const MemberManager = require('../lib/services/members/MemberManager')
const SubjectList = require('../lib/services/members/SubjectList')

describe('services', function () {
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
        name: 'robot-orphaned',
        namespace: 'garden-foo',
        role: 'myrole'
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
        },
        secrets: [
          {
            name: 'secret-1'
          }
        ]
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
        },
        secrets: [
          {
            name: 'secret-1'
          },
          {
            name: 'secret-2'
          }
        ]
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
        mergePatch: jest.fn().mockResolvedValue()
      }
      client.core.serviceaccounts = {
        create: jest.fn().mockImplementation((namespace, body) => {
          return Promise.resolve(_.set(body, 'metadata.creationTimestamp', 'now'))
        }),
        delete: jest.fn().mockImplementation((namespace, name) => {
          const item = _.find(serviceAccounts, { metadata: { name, namespace } })
          if (!item) {
            return Promise.reject(createError(404))
          }
          return Promise.resolve(item)
        }),
        mergePatch: jest.fn().mockResolvedValue()
      }
      client.core.secrets = {
        delete: jest.fn().mockResolvedValue()
      }
    })

    describe('SubjectList', function () {
      const subjectList = new SubjectList(project)

      describe('#get', function () {
        it('should merge role, roles into roles', async function () {
          const memberRoles = subjectList.get('foo@bar.com').roles
          expect(memberRoles).toHaveLength(2)
          expect(memberRoles).toEqual(expect.arrayContaining(['admin', 'owner']))
        })
      })

      describe('#has', function () {
        it('should merge role, roles into roles', async function () {
          expect(subjectList.has('foo@bar.com')).toBe(true)
          expect(subjectList.has('foo@baz.com')).toBe(false)
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

          expect(frontendMemberList).toHaveLength(9)
          expect(frontendMemberList).toContainEqual({
            username: 'mutiple@bar.com',
            roles: ['admin', 'viewer']
          })
          expect(frontendMemberList).toContainEqual({
            username: 'system:serviceaccount:garden-foo:robot-multiple',
            roles: ['otherrole', 'admin', 'myrole', 'viewer'],
            createdBy: 'foo',
            creationTimestamp: 'bar-time',
            description: undefined
          })
          expect(frontendMemberList).toContainEqual({
            username: 'system:serviceaccount:garden-foreign:robot-foreign-namespace',
            roles: ['myrole', 'viewer', 'admin']
          })
          expect(frontendMemberList).toContainEqual({
            username: 'system:serviceaccount:garden-foo:robot-nomember',
            roles: [],
            createdBy: 'foo',
            creationTimestamp: 'bar-time',
            description: undefined
          })
          expect(frontendMemberList).toContainEqual({
            username: 'system:serviceaccount:garden-foo:robot-orphaned',
            roles: ['myrole'],
            orphaned: true
          })
        })

        it('should normalize kind service account members subject to kind user with service account prefix and add metadata from service account', async function () {
          const frontendMemberList = memberManager.list()

          expect(frontendMemberList).toContainEqual({
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
          await expect(memberManager.get('john.doe@baz.com')).rejects.toThrow(NotFound)
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

          expect(newMemberListItem.subject.name).toEqual(name)
          expect(newMemberListItem.subject.kind).toBe('User')
          expect(newMemberListItem.subject.role).toBe('admin')
          expect(newMemberListItem.subject.roles).toEqual(expect.arrayContaining(['viewer', 'myrole']))
          expect(newMemberListItem.roles).toEqual(roles)
        })

        it('should add a service account to project', async function () {
          const name = 'system:serviceaccount:garden-foo:newsa'
          const roles = ['sa-role']

          await memberManager.create(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItem = memberSubjects.subjectListItems[name]

          expect(newMemberListItem.subject.name).toBe('newsa')
          expect(newMemberListItem.subject.kind).toBe('ServiceAccount')
          expect(newMemberListItem.subject.role).toBe('sa-role')
          expect(newMemberListItem.roles).toEqual(roles)
        })
      })

      describe('#update', function () {
        it('should throw NotFound', async function () {
          await expect(memberManager.update('john.doe@baz.com', {})).rejects.toThrow(NotFound)
        })

        it('should update a project member', async function () {
          const name = 'foo@bar.com'
          const roles = ['role1', 'role2']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const updatedMemberListItem = memberSubjects.subjectListItems[name]

          expect(updatedMemberListItem.subject.name).toEqual(name)
          expect(updatedMemberListItem.subject.kind).toBe('User')
          expect(updatedMemberListItem.subject.role).toBe('role1')
          expect(updatedMemberListItem.roles).toEqual(roles)
        })

        it('should add new roles to first occurrence of user, remove roles of other occurrences that are no longer assigned to member', async function () {
          const name = 'mutiple@bar.com'
          const roles = ['admin', 'newrole']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItemGroup = memberSubjects.subjectListItems[name]

          const firstUpdatedMemberListItem = newMemberListItemGroup.items[0]
          const secondUpdatedMemberListItem = newMemberListItemGroup.items[1]

          expect(firstUpdatedMemberListItem.subject.role).toBe('admin')
          expect(firstUpdatedMemberListItem.subject.roles).toEqual(expect.arrayContaining(['newrole']))

          expect(secondUpdatedMemberListItem.subject.role).toBe('admin')
          expect(secondUpdatedMemberListItem.subject.roles).toBeUndefined()
        })

        it('should remove member occurrences without roles', async function () {
          const name = 'mutiple@bar.com'
          const roles = ['otherrole']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItemGroup = memberSubjects.subjectListItems[name]

          const firstUpdatedMemberListItem = newMemberListItemGroup.items[0]
          const secondUpdatedMemberListItem = newMemberListItemGroup.items[1]

          expect(firstUpdatedMemberListItem.subject.role).toBe('otherrole')
          expect(firstUpdatedMemberListItem.subject.roles).toBeUndefined()

          expect(secondUpdatedMemberListItem).toBeUndefined()
        })

        it('should throw an error when trying to remove all roles with update', async function () {
          const name = 'foo@bar.com'
          const roles = []
          await expect(memberManager.update(name, { roles })).rejects.toThrow(UnprocessableEntity)
        })

        it('should not convert a service account kind user to kind serviceaccount', async function () {
          const name = 'system:serviceaccount:garden-foo:robot-user'
          const roles = ['admin', 'viewer']

          await memberManager.update(name, { roles }) // assign user to project
          const memberSubjects = memberManager.subjectList
          const newMemberListItem = memberSubjects.subjectListItems[name]

          expect(newMemberListItem.subject.name).toEqual(name)
          expect(newMemberListItem.subject.kind).toBe('User')
          expect(newMemberListItem.subject.role).toBe('admin')
          expect(newMemberListItem.subject.roles).toEqual(expect.arrayContaining(['viewer']))
          expect(newMemberListItem.roles).toEqual(roles)
        })
      })

      describe('#deleteServiceAccount', function () {
        it('should delete a serviceaccount', async function () {
          const id = 'system:serviceaccount:garden-foo:robot-sa'
          const item = memberManager.subjectList.get(id)
          await memberManager.deleteServiceAccount(item)
          expect(client.core.serviceaccounts.delete).toBeCalledWith('garden-foo', 'robot-sa')
          expect(memberManager.subjectList.has(id)).toBe(false)
        })

        it('should not delete a serviceaccount from a different namespace', async function () {
          const id = 'system:serviceaccount:garden-foreign:robot-foreign-namespace'
          const item = memberManager.subjectList.get(id)
          await memberManager.deleteServiceAccount(item)
          expect(client.core.serviceaccounts.delete).not.toBeCalled()
          expect(memberManager.subjectList.has(id)).toBe(true)
        })

        it('should not fail if service account has already been deleted', async function () {
          const id = 'system:serviceaccount:garden-foo:robot-orphaned'
          const item = memberManager.subjectList.get(id)
          await memberManager.deleteServiceAccount(item)
          expect(client.core.serviceaccounts.delete).toBeCalledWith('garden-foo', 'robot-orphaned')
          expect(memberManager.subjectList.has(id)).toBe(false)
        })
      })

      describe('#updateServiceAccount', function () {
        it('should not update a serviceaccount from a different namespace', async function () {
          const id = 'system:serviceaccount:garden-foreign:robot-foreign-namespace'
          const item = memberManager.subjectList.get(id)
          await expect(memberManager.updateServiceAccount(item, {})).rejects.toThrow(UnprocessableEntity)
        })
      })

      describe('#deleteServiceAccountSecret', function () {
        it('should delete a serviceaccount secret', async function () {
          const id = 'system:serviceaccount:garden-foo:robot-sa'
          const item = memberManager.subjectList.get(id)
          await memberManager.deleteServiceAccountSecret(item)
          expect(client.core.secrets.delete).toBeCalledWith('garden-foo', 'secret-1')
        })

        it('should not delete a serviceaccount secret from a different namespace', async function () {
          const id = 'system:serviceaccount:garden-foreign:robot-foreign-namespace'
          const item = memberManager.subjectList.get(id)
          await expect(memberManager.deleteServiceAccountSecret(item)).rejects.toThrow(UnprocessableEntity)
        })

        it('should not delete a service account secret if there is one more secret attached', async function () {
          const id = 'system:serviceaccount:garden-foo:robot-multiple'
          const item = memberManager.subjectList.get(id)
          await expect(memberManager.deleteServiceAccountSecret(item)).rejects.toThrow(UnprocessableEntity)
        })
      })
    })
  })
})
