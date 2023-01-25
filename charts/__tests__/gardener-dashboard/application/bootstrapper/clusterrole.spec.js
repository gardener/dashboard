//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderBootstrapperApplicationTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('clusterrole', () => {
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
        'clusterrole'
      ]
    })

    it('should not render the template', async () => {
      values.global.bootstrapper.enabled = false
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [clusterRole] = documents
      expect(clusterRole).toBe(null)
    })

    it('should render the template', async () => {
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [clusterRole] = documents
      expect(clusterRole).toMatchSnapshot()
    })
  })
})
