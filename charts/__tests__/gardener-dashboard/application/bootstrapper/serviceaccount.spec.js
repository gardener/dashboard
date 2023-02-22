//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { merge } = require('lodash')

const { helm } = fixtures

const renderTemplates = helm.renderBootstrapperApplicationTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('serviceaccount', () => {
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
        'serviceaccount'
      ]
    })

    it('should not render the template', async () => {
      values.global.bootstrapper.enabled = false
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [serviceaccount] = documents
      expect(serviceaccount).toBe(null)
    })

    it('should render the template', async () => {
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [serviceaccount] = documents
      expect(serviceaccount).toMatchSnapshot()
    })

    describe('when virtual garden is enabled', () => {
      beforeEach(() => {
        merge(values.global, {
          virtualGarden: {
            enabled: true,
            terminalBootstrapperUserName: 'runtime-cluster:system:serviceaccount:garden:gardener-dashboard-terminal-bootstrapper'
          }
        })
      })

      it('should not render the template', async () => {
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [serviceaccount] = documents
        expect(serviceaccount).toBe(null)
      })
    })
  })
})
