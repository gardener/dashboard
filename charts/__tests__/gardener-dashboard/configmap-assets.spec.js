//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { basename } = require('path')
const { helm, helper } = fixtures
const { encodeBase64 } = helper

const chart = basename(__dirname) + '/charts/runtime' // TODO discuss
const renderTemplates = (templates, values) => helm.renderChartTemplates(chart, templates, values)

describe('gardener-dashboard', function () {
  describe('configmap-assets', function () {
    let templates

    beforeEach(() => {
      templates = [
        'configmap-assets'
      ]
    })

    it('should render the template', async function () {
      const values = {
        global: {
          frontendConfig: {
            assets: {
              'bar.png': encodeBase64('foo\n')
            }
          }
        }
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [assets] = documents
      expect(assets).toMatchSnapshot()
    })
  })
})
