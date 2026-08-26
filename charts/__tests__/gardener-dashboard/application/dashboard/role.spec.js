//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderDashboardApplicationTemplates

describe('gardener-dashboard', function () {
  describe('role', function () {
    let templates

    beforeEach(() => {
      templates = [
        'role',
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
