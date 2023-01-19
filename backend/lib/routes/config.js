//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const logger = require('../logger')
const markdown = require('../markdown')
const express = require('express')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const config = require('../config')

const router = module.exports = express.Router()

const frontendConfig = sanitizeFrontendConfig(config.frontend)

router.route('/')
  .get(async (req, res, next) => {
    try {
      if (!frontendConfig.clusterIdentity) {
        try {
          const { data } = await dashboardClient.core.configmaps.get('kube-system', 'cluster-identity')
          frontendConfig.clusterIdentity = data['cluster-identity']
        } catch (err) {
          logger.error('Failed to get configmap kube-system/cluster-identity: %s', err.message)
        }
      }

      res.send(frontendConfig)
    } catch (err) {
      next(err)
    }
  })

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
    vendorHints = [],
    resourceQuotaHelp = '',
    controlPlaneHighAvailabilityHelp = ''
  } = sanitizedFrontendConfig

  convertAndSanitize(alert, 'message')
  convertAndSanitize(costObject, 'description')
  convertAndSanitize(sla, 'description')
  convertAndSanitize(addonDefinition, 'description')
  convertAndSanitize(resourceQuotaHelp, 'text')
  convertAndSanitize(controlPlaneHighAvailabilityHelp, 'text')

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
