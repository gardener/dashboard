//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderBootstrapperRuntimeTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('deployment', () => {
    let values
    let templates

    beforeEach(() => {
      values = {
        global: {
          bootstrapper: {
            enabled: true
          }
        }
      }
      templates = [
        'deployment'
      ]
    })

    it('should not render the template', async function () {
      values.global.bootstrapper.enabled = false
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment).toBe(null)
    })

    it('should render the template with default values', async () => {
      values.global.bootstrapper.kubeconfig = 'apiVersion: v1'
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [deployment] = documents
      expect(deployment).toMatchSnapshot({
        spec: {
          template: {
            metadata: {
              annotations: {
                'checksum/configmap-gardener-dashboard-terminal-bootstrapper-config': expect.stringMatching(/[0-9a-f]{64}/),
                'checksum/secret-gardener-dashboard-terminal-bootstrapper-kubeconfig': expect.stringMatching(/[0-9a-f]{64}/)
              }
            }
          }
        }
      })
    })
  })
})
