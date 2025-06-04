//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('../dist/lib/cache', () => {
  const projectList = [
    {
      metadata: {
        name: 'foo',
      },
      spec: {
        members: [
          {
            kind: 'User',
            name: 'foo@bar.com',
          },
          {
            kind: 'User',
            name: 'system:serviceaccount:garden-foo:robot-user',
          },
          {
            kind: 'ServiceAccount',
            name: 'robot-sa',
            namespace: 'garden-foo',
          },
        ],
      },
      status: {
        phase: 'Ready',
      },
    },
    {
      metadata: {
        name: 'bar',
      },
      spec: {
        members: [
          {
            kind: 'User',
            name: 'bar@bar.com',
          },
        ],
      },
      status: {
        phase: 'Ready',
      },
    },
    {
      metadata: {
        name: 'pending',
      },
      spec: {
        members: [
          {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'User',
            name: 'bar@bar.com',
          },
        ],
      },
    },
    {
      metadata: {
        name: 'terminating',
      },
      status: {
        phase: 'Terminating',
      },
    },
  ]

  return {
    getProjects: jest.fn(() => projectList),
    getProject: jest.fn(name => projectList.find(project => project.metadata.name === name)),
  }
})
jest.mock('../dist/lib/services/shoots')
jest.mock('../dist/lib/services/authorization')
jest.mock('@gardener-dashboard/kube-client', () => ({
  dashboardClient: {
    'core.gardener.cloud': {
      projects: {
        watch: jest.fn(),
      },
    },
  },
}))

describe('services/projects', () => {
  const { PreconditionFailed, InternalServerError } = require('http-errors')
  const projects = require('../dist/lib/services/projects')
  const shoots = require('../dist/lib/services/shoots')
  const authorization = require('../dist/lib/services/authorization')
  const { dashboardClient } = require('@gardener-dashboard/kube-client')

  const createUser = (username) => {
    return {
      id: username,
      client: {
        'core.gardener.cloud': {
          projects: {
            create: jest.fn(),
            get: jest.fn(),
            mergePatch: jest.fn(),
            delete: jest.fn(),
          },
        },
      },
    }
  }

  describe('#list', () => {
    it('should return all projects if user can list all projects', async () => {
      authorization.canListProjects.mockImplementation(user => Promise.resolve(user.id === 'projects-viewer@bar.com'))
      const user = createUser('projects-viewer@bar.com')

      const result = await projects.list({ user })
      expect(result).toHaveLength(3)
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ metadata: { name: 'foo' } }),
        expect.objectContaining({ metadata: { name: 'bar' } }),
        expect.objectContaining({ metadata: { name: 'terminating' } }),
      ]))
    })

    it('should return project for user member', async () => {
      authorization.canListProjects.mockResolvedValue(false)
      const user = createUser('foo@bar.com')

      const result = await projects.list({ user })
      expect(result).toHaveLength(1)
      expect(result[0].metadata.name).toBe('foo')
    })

    it('should return project for serviceaccount user member', async () => {
      authorization.canListProjects.mockResolvedValue(false)
      const user = createUser('system:serviceaccount:garden-foo:robot-user')

      const result = await projects.list({ user })
      expect(result).toHaveLength(1)
      expect(result[0].metadata.name).toBe('foo')
    })

    it('should return project for serviceaccount member', async function () {
      const userProjects = await projects.list({ user: createUser('system:serviceaccount:garden-foo:robot-sa') })
      expect(userProjects).toHaveLength(1)
      expect(userProjects[0].metadata.name).toBe('foo')
    })

    it('should not return project if not in member list', async () => {
      authorization.canListProjects.mockResolvedValue(false)
      const user = createUser('other@bar.com')

      const result = await projects.list({ user })
      expect(result).toHaveLength(0)
    })
  })

  describe('#create', () => {
    it('should create a project and return it when ready', async () => {
      const body = { metadata: { name: 'foo' } }
      const user = createUser('creator@bar.com')

      // Mock the project creation to return a pending project
      user.client['core.gardener.cloud'].projects.create.mockResolvedValue({
        ...body,
        status: { phase: 'Pending' },
      })

      // Mock the watch functionality to eventually return a ready project
      dashboardClient['core.gardener.cloud'].projects.watch.mockResolvedValue({
        until: jest.fn(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ...body,
                status: { phase: 'Ready' },
              })
            }, 10) // Simulate delay for the project to become ready
          })
        }),
      })

      const result = await projects.create({ user, body })
      expect(result).toMatchSnapshot()
    })

    it('should throw an error if project creation times out', async () => {
      const body = { metadata: { name: 'foo' } }
      const user = createUser('creator@bar.com')
      user.client['core.gardener.cloud'].projects.create.mockResolvedValue({
        ...body,
        status: { phase: 'Pending' },
      })
      dashboardClient['core.gardener.cloud'].projects.watch.mockResolvedValue({
        until: jest.fn().mockRejectedValue(new Error('Timeout')),
      })

      await expect(projects.create({ user, body })).rejects.toThrow('Timeout')
    })

    it('should throw an InternalServerError if project is deleted', async () => {
      const body = { metadata: { name: 'foo' } }
      const user = createUser('creator@bar.com')
      user.client['core.gardener.cloud'].projects.create.mockResolvedValue({
        ...body,
        status: { phase: 'Pending' },
      })
      dashboardClient['core.gardener.cloud'].projects.watch.mockResolvedValue({
        until: jest.fn((isProjectReady) => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              try {
                isProjectReady({ type: 'DELETE', object: { metadata: { name: 'foo' } } })
              } catch (error) {
                reject(error)
              }
            }, 10) // Simulate delay before project is deleted
          })
        }),
      })

      await expect(projects.create({ user, body })).rejects.toThrow(InternalServerError)
    })

    it('should return ok: true when project status is Ready', async () => {
      const body = { metadata: { name: 'foo' } }
      const user = createUser('creator@bar.com')
      user.client['core.gardener.cloud'].projects.create.mockResolvedValue({
        ...body,
        status: { phase: 'Pending' },
      })
      dashboardClient['core.gardener.cloud'].projects.watch.mockResolvedValue({
        until: jest.fn((isProjectReady) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(isProjectReady({ type: 'MODIFIED', object: { ...body, status: { phase: 'Ready' } } }))
            }, 10) // Simulate delay before project becomes ready
          })
        }),
      })

      const result = await projects.create({ user, body })
      expect(result).toMatchObject({ ok: true })
    })

    it('should return ok: false when project status is not Ready', async () => {
      const body = { metadata: { name: 'foo' } }
      const user = createUser('creator@bar.com')
      user.client['core.gardener.cloud'].projects.create.mockResolvedValue({
        ...body,
        status: { phase: 'Pending' },
      })
      dashboardClient['core.gardener.cloud'].projects.watch.mockResolvedValue({
        until: jest.fn((isProjectReady) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(isProjectReady({ type: 'MODIFIED', object: { ...body, status: { phase: 'Pending' } } }))
            }, 10) // Simulate delay before project remains pending
          })
        }),
      })

      const result = await projects.create({ user, body })
      expect(result).toMatchObject({ ok: false })
    })
  })

  describe('#read', () => {
    it('should return a project by name', async () => {
      const project = { metadata: { name: 'foo' } }
      const user = createUser('reader@bar.com')
      user.client['core.gardener.cloud'].projects.get.mockResolvedValue(project)

      const result = await projects.read({ user, name: 'foo' })
      expect(result).toEqual(project)
    })
  })

  describe('#patch', () => {
    it('should patch a project and return the updated project', async () => {
      const project = { metadata: { name: 'foo' } }
      const user = createUser('patcher@bar.com')
      user.client['core.gardener.cloud'].projects.mergePatch.mockResolvedValue(project)

      const result = await projects.patch({ user, name: 'foo', body: {} })
      expect(result).toEqual(project)
    })
  })

  describe('#remove', () => {
    it('should remove a project if preconditions are met', async () => {
      const project = { metadata: { name: 'foo' } }
      const user = createUser('remover@bar.com')
      shoots.list.mockResolvedValue({ items: [] })
      user.client['core.gardener.cloud'].projects.mergePatch.mockResolvedValue(project)
      user.client['core.gardener.cloud'].projects.delete.mockResolvedValue(project)

      const result = await projects.remove({ user, name: 'foo' })
      expect(result).toEqual(project)
    })

    it('should throw an error if project is not empty', async () => {
      const user = createUser('remover@bar.com')
      shoots.list.mockResolvedValue({ items: [{}] })

      await expect(projects.remove({ user, name: 'foo' })).rejects.toThrow(PreconditionFailed)
    })

    it('should revert the annotation if deletion fails', async () => {
      const user = createUser('remover@bar.com')
      const projectName = 'foo'
      const error = new Error('Deletion failed')

      shoots.list.mockResolvedValue({ items: [] })

      user.client['core.gardener.cloud'].projects.mergePatch.mockResolvedValue({})

      user.client['core.gardener.cloud'].projects.delete.mockRejectedValue(error)

      await expect(projects.remove({ user, name: projectName })).rejects.toThrow('Deletion failed')

      expect(user.client['core.gardener.cloud'].projects.mergePatch).toHaveBeenCalledTimes(2)

      expect(user.client['core.gardener.cloud'].projects.mergePatch).toHaveBeenCalledWith(projectName, {
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/deletion': 'true',
          },
        },
      })

      expect(user.client['core.gardener.cloud'].projects.mergePatch).toHaveBeenCalledWith(projectName, {
        metadata: {
          annotations: {
            'confirmation.gardener.cloud/deletion': null,
          },
        },
      })
    })
  })
})
