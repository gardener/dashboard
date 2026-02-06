//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderDashboardRuntimeTemplates

describe('gardener-dashboard', function () {
  describe('poddisruptionbudget', function () {
    let templates

    beforeEach(() => {
      templates = ['poddisruptionbudget']
    })

    it('should not render template without values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      expect(documents[0]).toBe(null)
    })

    it('should render the template with minAvailable', async function () {
      const values = {
        global: {
          dashboard: {
            podDisruptionBudget: {
              minAvailable: 2,
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [poddisruptionbudget] = documents
      expect(poddisruptionbudget.spec.minAvailable).toEqual(values.global.dashboard.podDisruptionBudget.minAvailable)
    })

    it('should render the template with maxUnavailable', async function () {
      const values = {
        global: {
          dashboard: {
            podDisruptionBudget: {
              maxUnavailable: 2,
            },
          },
        },
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [poddisruptionbudget] = documents
      expect(poddisruptionbudget.spec.maxUnavailable).toEqual(values.global.dashboard.podDisruptionBudget.maxUnavailable)
    })

    it('should fail when both minAvailable and maxUnavailable are set', async function () {
      const values = {
        global: {
          dashboard: {
            podDisruptionBudget: {
              minAvailable: 1,
              maxUnavailable: 1,
            },
          },
        },
      }
      await expect(renderTemplates(templates, values)).rejects.toThrow('podDisruptionBudget: specify either minAvailable or maxUnavailable, not both')
    })
  })
})
