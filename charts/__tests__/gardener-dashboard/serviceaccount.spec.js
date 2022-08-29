//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { basename } = require('path')
const { helm } = fixtures

const chart = basename(__dirname) + '/charts/application' // TODO discuss
const renderTemplates = (templates, values) => helm.renderChartTemplates(chart, templates, values)

describe('gardener-dashboard', function () {
  describe('serviceaccount', function () {
    let templates

    beforeEach(() => {
      templates = [
        'serviceaccount'
      ]
    })

    it('should render the template', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [serviceaccount] = documents
      expect(serviceaccount).toMatchSnapshot()
    })

    it('should not render the template', async function () {
      const values = {
        global: {
          virtualGarden: {
            enabled: true,
            userName: 'runtime-cluster:system:serviceaccount:garden:gardener-dashboard'
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [serviceaccount] = documents
      expect(serviceaccount).toBeFalsy()
    })
  })
})
