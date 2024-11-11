//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { helm } = fixtures

const renderTemplates = helm.renderDashboardApplicationTemplates

describe('gardener-dashboard', function () {
  describe('rolebinding', function () {
    let templates

    beforeEach(() => {
      templates = [
        'rolebinding',
      ]
    })

    it('should render the template with default values', async function () {
      const values = {}
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [roleBinding] = documents
      expect(roleBinding).toMatchSnapshot()
    })

    describe('when virtual garden is enabled', function () {
      it('should render the template', async function () {
        const values = {
          global: {
            virtualGarden: {
              enabled: true,
              userName: 'runtime-cluster:system:serviceaccount:garden:gardener-dashboard',
            },
            dashboard: {
              serviceAccountName: 'gardener-dashboard',
            },
          },
        }
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [roleBinding] = documents
        expect(roleBinding).toMatchSnapshot()
      })
    })
  })
})
