//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderDashboardApplicationTemplates

describe('gardener-dashboard', function () {
  describe('lease-github-webhook', function () {
    let templates

    beforeEach(() => {
      templates = [
        'lease-github-webhook'
      ]
    })

    it('should not render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [leaseGithubWebhook] = documents
      expect(leaseGithubWebhook).toMatchSnapshot()
    })

    it('should render the template if gitHub webhook is configured', async function () {
      const values = {
        global: {
          dashboard: {
            gitHub: {
              webhookSecret: 'foobar'
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [leaseGithubWebhook] = documents
      expect(leaseGithubWebhook).toMatchSnapshot()
    })
  })
})
