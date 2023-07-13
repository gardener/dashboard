//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const projects = require('../lib/services/projects')
const cache = require('../lib/cache')
const authorization = require('../lib/services/authorization')

describe('services', function () {
  describe('projects', function () {
    const projectList = [
      {
        spec: {
          members: [
            {
              kind: 'User',
              name: 'foo@bar.com'
            },
            {
              kind: 'User',
              name: 'system:serviceaccount:garden-foo:robot-user'
            },
            {
              kind: 'ServiceAccount',
              name: 'robot-sa',
              namespace: 'garden-foo'
            }
          ]
        },
        metadata: {
          name: 'foo'
        },
        status: {
          phase: 'Ready'
        }
      },
      {
        spec: {
          members: [
            {
              kind: 'User',
              name: 'bar@bar.com'
            }
          ]
        },
        metadata: {
          name: 'bar'
        },
        status: {
          phase: 'Ready'
        }
      },
      {
        spec: {
          members: [
            {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'User',
              name: 'bar@bar.com'
            }
          ]
        },
        metadata: {
          name: 'notReady'
        }
      }
    ]

    const createUser = (username) => {
      return {
        id: username
      }
    }

    beforeEach(function () {
      jest.spyOn(cache, 'getProjects').mockReturnValue(projectList)
      jest.spyOn(authorization, 'isAdmin').mockImplementation(user => Promise.resolve(user.id === 'admin@bar.com'))
    })

    describe('#list', function () {
      it('should return all projects if user is admin, including not ready projects', async function () {
        const userProjects = await projects.list({ user: createUser('admin@bar.com') })
        expect(userProjects).toHaveLength(2)
      })

      it('should return project for user member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-user') })
        expect(userProjects).toHaveLength(1)
        expect(userProjects[0].metadata.name).toBe('foo')
      })

      it('should return project for serviceaccount user member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-user') })
        expect(userProjects).toHaveLength(1)
        expect(userProjects[0].metadata.name).toBe('foo')
      })

      it('should return project for serviceaccount member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-sa') })
        expect(userProjects).toHaveLength(1)
        expect(userProjects[0].metadata.name).toBe('foo')
      })

      it('should not return project if not in member list', async function () {
        const userProjects = await projects.list({ user: createUser('other@bar.com') })
        expect(userProjects).toHaveLength(0)
      })
    })
  })
})
