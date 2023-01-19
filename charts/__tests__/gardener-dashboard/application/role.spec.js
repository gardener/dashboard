//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { basename } = require('path')
const { helm } = fixtures

const renderTemplates = helm.renderTemplatesFn('gardener-dashboard', 'charts', basename(__dirname))

describe('gardener-dashboard', function () {
  describe('role', function () {
    let templates

    beforeEach(() => {
      templates = [
        'role'
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [clusterRole] = documents
      expect(clusterRole).toMatchSnapshot()
    })
  })
})
