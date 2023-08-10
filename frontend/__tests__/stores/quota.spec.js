//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { setActivePinia, createPinia } from 'pinia'
import { useAuthzStore } from '@/store/authz'
import { useQuotaStore } from '@/store/quota'
import { aggregateResourceQuotaStatus } from '@/store/quota/helper'

describe('stores', () => {
  describe('quota', () => {
    const namespace = 'default'

    let authzStore
    let quotaStore

    function setQuota (quota) {
      quotaStore.quotas = {
        [namespace]: quota,
      }
    }

    beforeEach(async () => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace(namespace)
      quotaStore = useQuotaStore()
      quotaStore.quotas = {}
    })

    describe('#projectQuotaStatus', () => {
      it('should return the projectQuotaStatus for the default namespace', () => {
        setQuota({
          hard: {
            'count/shoots.core.gardener.cloud': 25,
            'count/configmaps': 22,
          },
          used: {
            'count/shoots.core.gardener.cloud': 20,
          },
        })

        expect(quotaStore.projectQuotaStatus).toEqual([
          {
            key: 'count/configmaps',
            resourceName: 'configmaps',
            caption: 'Configmaps',
            limitValue: 22,
            usedValue: 0,
            percentage: 0,
            progressColor: 'primary',
          }, {
            key: 'count/shoots.core.gardener.cloud',
            resourceName: 'shoots.core.gardener.cloud',
            caption: 'Shoots',
            limitValue: 25,
            usedValue: 20,
            percentage: 80,
            progressColor: 'warning',
          },
        ])
      })
    })

    describe('helper', () => {
      describe('#aggregateResourceQuotaStatus', () => {
        const resourceQuotaStatuses = [
          {
            hard: {
              'count/shoots.core.gardener.cloud': '25',
              'count/configmaps': '22',
              'count/secrets': '70',
            },
            used: {
              'count/shoots.core.gardener.cloud': '10',
              'count/secrets': '70',
            },
          },
          {
            hard: {
              'count/rolebindings': '14',
              'count/shoots.core.gardener.cloud': '30',
              'count/configmaps': '10',
            },
            used: {
              'count/shoots.core.gardener.cloud': '20',
              'count/configmaps': '5',
              'count/secrets': '50',
            },
          },
        ]

        it('should return aggregated resource quota status', () => {
          const aggregatedQuotaStatus = aggregateResourceQuotaStatus(resourceQuotaStatuses)

          expect(aggregatedQuotaStatus).toEqual({
            hard: {
              'count/shoots.core.gardener.cloud': '25',
              'count/configmaps': '10',
              'count/secrets': '70',
              'count/rolebindings': '14',
            },
            used: {
              'count/shoots.core.gardener.cloud': '20',
              'count/configmaps': '5',
              'count/secrets': '70',
            },
          })
        })
      })
    })
  })
})
