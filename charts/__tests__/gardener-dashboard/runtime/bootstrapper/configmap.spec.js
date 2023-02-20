//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { omit, merge } = require('lodash')
const { helm } = fixtures

const renderTemplates = helm.renderBootstrapperRuntimeTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('configmap', () => {
    let values
    let templates

    beforeEach(() => {
      values = {
        global: {
          bootstrapper: {
            enabled: true
          },
          terminal: {}
        }
      }
      templates = [
        'configmap-config'
      ]
    })

    it('should not render the template', async () => {
      values.global.bootstrapper.enabled = false
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [configMap] = documents
      expect(configMap).toBe(null)
    })

    it('should render the template w/ defaults values', async () => {
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [configMap] = documents
      expect(omit(configMap, ['data'])).toMatchSnapshot()
      const config = yaml.load(configMap.data['config.yaml'])
      expect(config).toMatchSnapshot()
    })

    describe('when bootstrap is enabled for all clusters', () => {
      beforeEach(() => {
        merge(values.global, {
          terminal: {
            bootstrap: {
              disabled: false,
              seedDisabled: false,
              shootDisabled: false,
              gardenTerminalHostDisabled: false,
              apiServerIngress: {
                annotations: {
                  'kubernetes.io/ingress.class': 'nginx'
                }
              },
              queueOptions: {
                concurrent: 3
              }
            },
            unreachableSeeds: {
              matchLabels: {
                seed: 'unreachable'
              }
            }
          }
        })
      })

      it('should render the template', async () => {
        const documents = await renderTemplates(templates, values)
        expect(documents).toHaveLength(1)
        const [configMap] = documents
        const config = yaml.load(configMap.data['config.yaml'])
        expect(config).toMatchSnapshot()
      })
    })
  })
})
