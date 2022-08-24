//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { basename } = require('path')
const { helm } = fixtures

const chart = basename(__dirname) + '/charts/runtime' // TODO discuss
const renderTemplates = (templates, values) => helm.renderChartTemplates(chart, templates, values)

describe('gardener-dashboard', function () {
  describe('vpa', function () {
    let templates

    beforeEach(() => {
      templates = [
        'vpa'
      ]
    })

    it('should render the template with default values', async function () {
      const values = {
        global: {
          vpa: {
            dummy: false
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [vpa] = documents
      expect(vpa).toMatchSnapshot()
    })

    it('should not render the template', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [vpa] = documents
      expect(vpa).toBeFalsy()
    })

    it('should render the template with overwritten values', async function () {
      const values = {
        global: {
          vpa: {
            updateMode: 'Auto',
            controlledValues: 'RequestsAndLimits',
            minAllowedCpu: '30m',
            minAllowedMemory: '60Mi',
            maxAllowedCpu: '1000m',
            maxAllowedMemory: '1200Mi'
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [vpa] = documents
      expect(vpa).toMatchSnapshot()
    })
  })
})
