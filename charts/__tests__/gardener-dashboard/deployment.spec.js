//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { basename } = require('path')
const { helm } = fixtures

const chart = basename(__dirname)
const renderTemplates = (templates, values) => helm.renderChartTemplates(chart, templates, values)

describe('gardener-dashboard', function () {
  describe('deployment', function () {
    let templates

    beforeEach(() => {
      templates = [
        'deployment'
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment).toMatchSnapshot({
        spec: {
          template: {
            metadata: {
              annotations: {
                'checksum/configmap-gardener-dashboard-config': expect.stringMatching(/[0-9a-f]{64}/),
                'checksum/secret-gardener-dashboard-oidc': expect.stringMatching(/[0-9a-f]{64}/),
                'checksum/secret-gardener-dashboard-sessionSecret': expect.stringMatching(/[0-9a-f]{64}/)
              }
            }
          }
        }
      })
    })

    it('should render the template with optimized garbage collector', async function () {
      const values = {
        nodeOptions: '--optimize_for_size --max_old_space_size=460 --gc_interval=100'
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      const containers = deployment.spec.template.spec.containers
      expect(containers).toHaveLength(1)
      const [container] = containers
      expect(container.env).toMatchSnapshot()
    })
  })
})
