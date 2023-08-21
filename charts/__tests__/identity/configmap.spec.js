//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const yaml = require('js-yaml')
const { omit } = require('lodash')
const { helm } = fixtures

const renderTemplates = helm.renderIdentityTemplates

describe('identity', function () {
  describe('configmap', function () {
    let templates

    beforeEach(() => {
      templates = [
        'configmap'
      ]
    })

    it('should render the template w/ defaults values', async function () {
      const documents = await renderTemplates(templates, {})
      expect(documents).toHaveLength(1)
      const [configMap] = documents
      expect(omit(configMap, ['data'])).toMatchSnapshot()
      expect(Object.keys(configMap.data)).toEqual(['config.yaml'])
      const config = yaml.load(configMap.data['config.yaml'])
      expect(config).toMatchSnapshot()
    })
  })
})
