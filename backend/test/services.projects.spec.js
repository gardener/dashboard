//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const delay = require('delay')
const projects = require('../lib/services/projects')
const cache = require('../lib/cache')
const authorization = require('../lib/services/authorization')

const { expect } = require('chai')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

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
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'User',
              name: 'bar@bar.com',
              role: 'admin',
              roles: [
                'owner'
              ]
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
              name: 'bar@bar.com',
              role: 'admin',
              roles: [
                'owner'
              ]
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
      sandbox.stub(cache, 'getProjects').returns(projectList)
      sandbox.stub(authorization, 'isAdmin').callsFake(async (user) => {
        await delay(1)
        if (user.id === 'admin@bar.com') {
          return true
        }
        return false
      })
    })

    describe('#list', function () {
      it('should return all ready projects if user is admin', async function () {
        const userProjects = await projects.list({ user: createUser('admin@bar.com') })
        expect(userProjects).to.have.length(2)
      })

      it('should return project for user member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-user') })
        expect(userProjects).to.have.length(1)
        expect(userProjects[0].metadata.name).to.eql('foo')
      })

      it('should return project for serviceaccount user member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-user') })
        expect(userProjects).to.have.length(1)
        expect(userProjects[0].metadata.name).to.eql('foo')
      })

      it('should return project for serviceaccount member', async function () {
        const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-sa') })
        expect(userProjects).to.have.length(1)
        expect(userProjects[0].metadata.name).to.eql('foo')
      })

      it('should not return project if not in member list', async function () {
        const userProjects = await projects.list({ user: createUser('other@bar.com') })
        expect(userProjects).to.have.length(0)
      })
    })
  })
})
