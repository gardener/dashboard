//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import {
  getDashboardUrlPath,
  getGardenClusterIdentity,
  list,
  replaceVersion,
} from '../lib/services/shoots.js'
import config from '../lib/config/index.js'
import { mockRequest } from '@gardener-dashboard/request'
import cache from '../lib/cache/index.js'
import * as authorization from '../lib/services/authorization.js'
import * as authentication from '../lib/services/authentication.js'

describe('services', function () {
  describe('shoots', function () {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    describe('#list', function () {
      it('should exclude Pending member project namespaces from the _all fallback', async function () {
        const user = { id: 'member@example.org', groups: [] }
        const pendingProject = {
          metadata: { name: 'pending' },
          spec: {
            namespace: 'garden-pending',
            members: [{ kind: 'User', name: user.id }],
          },
          status: { phase: 'Pending' },
        }
        vi.spyOn(authorization, 'canListShoots').mockResolvedValue(false)
        vi.spyOn(authentication, 'ensureUserGroups').mockResolvedValue()
        vi.spyOn(cache, 'getProjects').mockReturnValue([pendingProject])
        vi.spyOn(cache, 'getShoots').mockReturnValue([])

        const result = await list({ user, namespace: '_all' })

        expect(result.items).toEqual([])
        expect(authorization.canListShoots).toHaveBeenCalledExactlyOnceWith(user)
        expect(cache.getShoots).not.toHaveBeenCalled()
      })
    })

    describe('#replaceVersion', function () {
      const namespace = 'garden-test'
      const name = 'test'

      function createUser (shoot) {
        const get = vi.fn().mockResolvedValue(shoot)
        const jsonPatch = vi.fn().mockResolvedValue(shoot)
        const user = {
          client: {
            'core.gardener.cloud': {
              shoots: {
                get,
                jsonPatch,
              },
            },
          },
        }
        return { user, get, jsonPatch }
      }

      it('should atomically remove the deprecated DNS provider secretName when upgrading to Kubernetes 1.35', async function () {
        const shoot = {
          spec: {
            kubernetes: {
              version: '1.34.3',
            },
            dns: {
              providers: [{
                secretName: 'dns-secret',
              }],
            },
          },
        }
        const { user, get, jsonPatch } = createUser(shoot)

        await replaceVersion({
          user,
          namespace,
          name,
          body: { version: '1.35.0' },
        })

        expect(get).toHaveBeenCalledExactlyOnceWith(namespace, name)
        expect(jsonPatch).toHaveBeenCalledExactlyOnceWith(namespace, name, [{
          op: 'replace',
          path: '/spec/kubernetes/version',
          value: '1.35.0',
        }, {
          op: 'remove',
          path: '/spec/dns/providers/0/secretName',
        }])
      })

      it.each([
        {
          description: 'the target version is below 1.35',
          currentVersion: '1.34.2',
          targetVersion: '1.34.3',
          secretName: 'dns-secret',
          expectGet: false,
        },
        {
          description: 'the target version is above 1.35',
          currentVersion: '1.35.2',
          targetVersion: '1.36.0',
          secretName: 'dns-secret',
          expectGet: false,
        },
        {
          description: 'the version change is not an upgrade',
          currentVersion: '1.35.1',
          targetVersion: '1.35.0',
          secretName: 'dns-secret',
          expectGet: true,
        },
        {
          description: 'the deprecated field is absent',
          currentVersion: '1.34.3',
          targetVersion: '1.35.0',
          secretName: undefined,
          expectGet: true,
        },
      ])('should only replace the version when $description', async function ({
        currentVersion,
        targetVersion,
        secretName,
        expectGet,
      }) {
        const provider = secretName === undefined ? {} : { secretName }
        const shoot = {
          spec: {
            kubernetes: {
              version: currentVersion,
            },
            dns: {
              providers: [provider],
            },
          },
        }
        const { user, get, jsonPatch } = createUser(shoot)

        await replaceVersion({
          user,
          namespace,
          name,
          body: { version: targetVersion },
        })

        expect(get).toHaveBeenCalledTimes(expectGet ? 1 : 0)
        expect(jsonPatch).toHaveBeenCalledExactlyOnceWith(namespace, name, [{
          op: 'replace',
          path: '/spec/kubernetes/version',
          value: targetVersion,
        }])
      })
    })

    describe('#getDashboardUrlPath', function () {
      it('should return dashboard URL path for kubernetes version < 1.16.0', function () {
        expect(getDashboardUrlPath('1.14.0')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/',
        )
        expect(getDashboardUrlPath('1.15.1')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/',
        )
        expect(getDashboardUrlPath('1.15.9')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/',
        )
      })

      it('should return dashboard URL path for kubernetes version >= 1.16.0', function () {
        expect(getDashboardUrlPath('1.16.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/',
        )
        expect(getDashboardUrlPath('1.16.1')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/',
        )
        expect(getDashboardUrlPath('1.17.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/',
        )
        expect(getDashboardUrlPath('v1.17.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/',
        )
      })

      it('should return no dashboard URL path', function () {
        expect(getDashboardUrlPath(undefined)).toBeUndefined()
      })
    })

    describe('#getGardenClusterIdentity', function () {
      const clusterIdentity = config.clusterIdentity
      let clusterIdentityStub

      beforeEach(function () {
        clusterIdentityStub = vi.fn()
        Object.defineProperty(config, 'clusterIdentity', { configurable: true, get: clusterIdentityStub })
      })

      afterEach(function () {
        Object.defineProperty(config, 'clusterIdentity', { configurable: true, value: clusterIdentity })
      })

      it('should return value from cluster identity configmap', async function () {
        clusterIdentityStub.mockReturnValue(undefined)
        mockRequest.mockImplementationOnce(fixtures.configmaps.mocks.get())

        expect(await getGardenClusterIdentity()).toEqual('kubernetes')
      })

      it('should return value from dashboard config, if present', async function () {
        clusterIdentityStub.mockReturnValue('myCluster')
        const reqStub = vi.fn()
        mockRequest.mockImplementationOnce(reqStub)

        expect(await getGardenClusterIdentity()).toEqual('myCluster')
        expect(reqStub).not.toHaveBeenCalled()
      })
    })
  })
})
