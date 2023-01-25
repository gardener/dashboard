//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { helm, helper } = fixtures

const renderTemplates = helm.renderBootstrapperRuntimeTemplates

describe('gardener-dashboard-terminal-bootstrapper', () => {
  describe('secret-kubeconfig', function () {
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
        'secret-kubeconfig'
      ]
    })

    it('should not render the template', async function () {
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [kubeconfigSecret] = documents
      expect(kubeconfigSecret).toBe(null)
    })

    it('should render the template', async function () {
      values.global.bootstrapper.kubeconfig = 'apiVersion: v1'
      const documents = await renderTemplates(templates, values)
      expect(documents).toHaveLength(1)
      const [kubeconfigSecret] = documents
      expect(kubeconfigSecret).toMatchSnapshot({
        data: {
          'kubeconfig.yaml': expect.any(String)
        }
      })
      const kubeconfig = yaml.load(helper.decodeBase64(kubeconfigSecret.data['kubeconfig.yaml']))
      expect(kubeconfig).toMatchSnapshot('kubeconfig.yaml')
    })
  })
})
