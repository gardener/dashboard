//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const logger = require('./logger')
const markdown = require('./markdown')

module.exports = function handler (config, dashboardClient) {
  const frontendConfig = sanitizeFrontendConfig(config.frontend)

  return async (req, res) => {
    if (!frontendConfig.clusterIdentity) {
      try {
        const { data } = await dashboardClient.core.configmaps.get('kube-system', 'cluster-identity')
        frontendConfig.clusterIdentity = data['cluster-identity']
      } catch (err) {
        logger.error('Failed to get configmap kube-system/cluster-identity: %s', err.message)
      }
    }
    res.json(frontendConfig)
  }
}

function sanitizeFrontendConfig (frontendConfig) {
  const converter = markdown.createConverter()
  const convertAndSanitize = (obj, key) => {
    if (obj[key]) {
      obj[key] = converter.makeSanitizedHtml(obj[key])
    }
  }

  const sanitizedFrontendConfig = _.cloneDeep(frontendConfig)
  const {
    alert = {},
    costObject = {},
    sla = {},
    addonDefinition = {},
    accessRestriction: {
      items = []
    } = {},
    vendorHints = []
  } = sanitizedFrontendConfig

  convertAndSanitize(alert, 'message')
  convertAndSanitize(costObject, 'description')
  convertAndSanitize(sla, 'description')
  convertAndSanitize(addonDefinition, 'description')

  for (const item of items) {
    const {
      display = {},
      input = {},
      options = []
    } = item
    convertAndSanitize(display, 'description')
    convertAndSanitize(input, 'description')
    for (const option of options) {
      const {
        display = {},
        input = {}
      } = option
      convertAndSanitize(display, 'description')
      convertAndSanitize(input, 'description')
    }
  }

  for (const vendorHint of vendorHints) {
    convertAndSanitize(vendorHint, 'message')
  }

  return sanitizedFrontendConfig
}
