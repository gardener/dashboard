//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { merge } = require('lodash')
const { helm } = fixtures

const renderTemplates = helm.renderBootstrapperRuntimeTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('serviceaccount', function () {
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

    it('should not render the template', async function () {
      values.global.bootstrapper.enabled = false
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [serviceaccount] = documents
      expect(serviceaccount).toBe(null)
    })

    describe('when virtual garden is enabled', function () {
      beforeEach(() => {
        merge(values.global, {
          virtualGarden: {
            enabled: true
          }
        })
      })

      it('should render the template', async function () {
        merge(values.global.bootstrapper, {
          serviceAccountTokenVolumeProjection: {
            enabled: true
          }
        })
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [serviceaccount] = documents
        expect(serviceaccount).toMatchSnapshot()
      })

      it('should not render the template', async function () {
        merge(values.global.bootstrapper, {
          serviceAccountTokenVolumeProjection: {
            enabled: false
          }
        })
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [serviceaccount] = documents
        expect(serviceaccount).toBe(null)
      })
    })
  })
})
