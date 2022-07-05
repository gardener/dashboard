//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const cache = require('../lib/cache')
const { dashboardClient, Store } = require('@gardener-dashboard/kube-client')
const { authorization, shoots, projects } = require('../lib/services/io')

const setStatusLabel = obj => _.set(obj, 'metadata.labels["shoot.gardener.cloud/status"]', obj.metadata.uid === 3 ? 'unhealthy' : 'healthy')

describe('services', () => {
  describe('io', () => {
    const user = {
      groups: []
    }
    const informers = {
      shoots: {
        store: new Store()
      },
      projects: {
        store: new Store()
      }
    }
    cache.initialize(informers)

    let mockCreateSubjectAccessReview

    beforeAll(() => {
      informers.projects.store.replace(fixtures.projects.list())
      informers.shoots.store.replace(fixtures.shoots.list().map(setStatusLabel))
    })

    afterAll(() => {
      cache.cache.clear()
      mockCreateSubjectAccessReview.mockRestore()
    })

    beforeEach(() => {
      user.id = 'foo@example.org'
      user.groups = []
      mockCreateSubjectAccessReview = jest.spyOn(dashboardClient['authorization.k8s.io'].subjectaccessreviews, 'create')
        .mockImplementation(body => {
          const {
            spec: {
              groups = [],
              resourceAttributes
            }
          } = body
          const allowed = groups.includes('admin') || (groups.includes('viewer') && ['shoots'].includes(resourceAttributes.resource))
          return Promise.resolve({
            status: {
              allowed
            }
          })
        })
    })

    afterEach(() => {
      mockCreateSubjectAccessReview.mockClear()
    })

    describe('shoots', () => {
      describe('listing shoots in all namespaces', () => {
        it('should succeed', async () => {
          user.groups.push('viewer')
          const { items } = await shoots.list({ user })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(mockCreateSubjectAccessReview.mock.calls[0]).toMatchSnapshot()
          expect(items).toMatchSnapshot()
        })

        it('should throw  a not authorized error', async () => {
          await expect(shoots.list({ user })).rejects.toThrowError('Not authorized to list shoots of all namespaces')
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
        })
      })

      describe('listing unhealthy shoots in all namespaces', () => {
        it('should succeed', async () => {
          user.groups.push('viewer')
          const { items } = await shoots.list({ user, shootsWithIssuesOnly: true })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(items).toMatchSnapshot()
        })
      })

      describe('listing shoots in namespace "garden-foo"', () => {
        const namespace = 'garden-foo'

        it('should succeed', async () => {
          user.groups.push('viewer')
          const { items } = await shoots.list({ user, namespace })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(mockCreateSubjectAccessReview.mock.calls[0]).toMatchSnapshot()
          expect(items).toMatchSnapshot()
        })

        it('should throw a not authorized error', async () => {
          await expect(shoots.list({ user, namespace })).rejects.toThrowError(`Not authorized to list shoots in namespace ${namespace}`)
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
        })
      })

      describe('reading a shoot in namespace "garden-foo"', () => {
        const namespace = 'garden-foo'

        it('should succeed', async () => {
          user.groups.push('viewer')
          const item = await shoots.read({ user, namespace, name: 'fooShoot' })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(mockCreateSubjectAccessReview.mock.calls[0]).toMatchSnapshot()
          expect(item).toMatchSnapshot()
        })

        it('should throw a not authorized error', async () => {
          await expect(shoots.read({ user, namespace, name: 'fooShoot' })).rejects.toThrowError(`Not authorized to get shoot fooShoot in namespace ${namespace}`)
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
        })

        it('should throw a not found error', async () => {
          user.groups.push('viewer')
          await expect(shoots.read({ user, namespace, name: 'bazShoot' })).rejects.toThrowError(`Shoot bazShoot not found in namespace ${namespace}`)
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
        })
      })
    })

    describe('projects', () => {
      const uids = items => _.map(items, 'metadata.uid')

      it('should return the two projects for user foo@example.org', async () => {
        const items = await projects.list({ user })
        expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
        expect(mockCreateSubjectAccessReview.mock.calls[0]).toMatchSnapshot()
        expect(uids(items)).toEqual([1, 2])
      })

      describe('when the user is an administrator', () => {
        beforeEach(() => {
          user.groups.push('admin')
        })

        it('should return all projects', async () => {
          const items = await projects.list({ user })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(uids(items)).toEqual([1, 2, 3, 4, 6, 7])
        })
      })

      describe('when the user is in group "group2"', () => {
        beforeEach(() => {
          user.groups.push('group2')
        })

        it('should return another project', async () => {
          const items = await projects.list({ user })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(uids(items)).toEqual([1, 2, 4])
        })
      })

      describe('when the user is system:serviceaccount:garden-bar:robot', () => {
        beforeEach(() => {
          user.id = 'system:serviceaccount:garden-bar:robot'
        })

        it('should return only one project', async () => {
          const items = await projects.list({ user })
          expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
          expect(uids(items)).toEqual([6])
        })
      })
    })

    describe('authorization', () => {
      it('should deny access for incomplete responses bodies', async () => {
        mockCreateSubjectAccessReview.mockResolvedValueOnce({})
        await expect(authorization.isAdmin(user)).resolves.toBe(false)
        expect(mockCreateSubjectAccessReview).toBeCalledTimes(1)
      })
    })
  })
})
