//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getProjectQuotaStatus, aggregateResourceQuotaStatus } from '@/store/modules/projectQuota'

describe('store.projectQuota.getters', () => {
  describe('getProjectQuotaStatus', () => {
    const projectQuota = {
      hard: {
        'count/shoots.core.gardener.cloud': 25,
        'count/configmaps': 22
      },
      used: {
        'count/shoots.core.gardener.cloud': 20
      }
    }

    it('should return ProjectQuotaStatus object', () => {
      const projectQuotaStatus = getProjectQuotaStatus(projectQuota)

      const projectQuotaStatusConfigmaps = projectQuotaStatus[0]
      const projectQuotaStatusShoots = projectQuotaStatus[1]
      expect(projectQuotaStatusConfigmaps).toEqual({
        key: 'count/configmaps',
        resourceName: 'configmaps',
        caption: 'Configmaps',
        limitValue: 22,
        usedValue: 0,
        percentage: 0,
        progressColor: 'primary'
      })

      expect(projectQuotaStatusShoots).toEqual({
        key: 'count/shoots.core.gardener.cloud',
        resourceName: 'shoots.core.gardener.cloud',
        caption: 'Shoots',
        limitValue: 25,
        usedValue: 20,
        percentage: 80,
        progressColor: 'warning'
      })
    })
  })

  describe('aggregateResourceQuotaStatus', () => {
    const resourceQuotaStatuses = [
      {
        hard: {
          'count/shoots.core.gardener.cloud': '25',
          'count/configmaps': '22',
          'count/secrets': '70'
        },
        used: {
          'count/shoots.core.gardener.cloud': '10',
          'count/secrets': '70'
        }
      },
      {
        hard: {
          'count/rolebindings': '14',
          'count/shoots.core.gardener.cloud': '30',
          'count/configmaps': '10'
        },
        used: {
          'count/shoots.core.gardener.cloud': '20',
          'count/configmaps': '5',
          'count/secrets': '50'
        }
      }
    ]

    it('should return aggregated resource quota status', () => {
      const aggregatedQuotaStatus = aggregateResourceQuotaStatus(resourceQuotaStatuses)

      expect(aggregatedQuotaStatus).toEqual({
        hard: {
          'count/shoots.core.gardener.cloud': '25',
          'count/configmaps': '10',
          'count/secrets': '70',
          'count/rolebindings': '14'
        },
        used: {
          'count/shoots.core.gardener.cloud': '20',
          'count/configmaps': '5',
          'count/secrets': '70'
        }
      })
    })
  })
})
