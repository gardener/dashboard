//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const {
  getDashboardUrlPath
} = require('../lib/services/shoots')

describe('services', function () {
  describe('shoots', function () {
    describe('#getDashboardUrlPath', function () {
      it('should return dashboard URL path for kubernetes version < 1.16.0', function () {
        expect(getDashboardUrlPath('1.14.0')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/'
        )
        expect(getDashboardUrlPath('1.15.1')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/'
        )
        expect(getDashboardUrlPath('1.15.9')).toBe(
          '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/'
        )
      })

      it('should return dashboard URL path for kubernetes version >= 1.16.0', function () {
        expect(getDashboardUrlPath('1.16.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
        )
        expect(getDashboardUrlPath('1.16.1')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
        )
        expect(getDashboardUrlPath('1.17.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
        )
        expect(getDashboardUrlPath('v1.17.0')).toBe(
          '/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/'
        )
      })

      it('should return no dashboard URL path', function () {
        expect(getDashboardUrlPath(undefined)).toBeUndefined()
      })
    })
  })
})
