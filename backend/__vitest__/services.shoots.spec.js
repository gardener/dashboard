//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
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
} from '../lib/services/shoots.js'
import config from '../lib/config/index.js'
import { mockRequest } from '@gardener-dashboard/request'

describe('services', function () {
  describe('shoots', function () {
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
