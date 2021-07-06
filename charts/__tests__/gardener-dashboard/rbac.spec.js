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
  describe('rbac', function () {
    let templates

    beforeEach(() => {
      templates = [
        'rbac'
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [clusterRoleBinding] = documents
      expect(clusterRoleBinding).toMatchSnapshot()
    })

    it('should not render the template', async function () {
      const values = {
        kubeconfig: 'apiVersion: v1'
      }
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [clusterRoleBinding] = documents
      expect(clusterRoleBinding).toBeFalsy()
    })
  })
})
