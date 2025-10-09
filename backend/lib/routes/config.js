//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import logger from '../logger/index.js'
import { createConverter } from '../markdown.js'
import express from 'express'
import kubeClientModule from '@gardener-dashboard/kube-client'
import config from '../config/index.js'
import { metricsRoute } from '../middleware.js'

const { dashboardClient } = kubeClientModule

const router = express.Router()

const frontendConfig = sanitizeFrontendConfig(config.frontend)
const metricsMiddleware = metricsRoute('config')

router.route('/')
  .all(metricsMiddleware)
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
  const converter = createConverter()
  const convertAndSanitize = (obj, key) => {
    const value = obj[key] // eslint-disable-line security/detect-object-injection -- key is a local fixed string
    if (value) {
      obj[key] = converter.makeSanitizedHtml(value) // eslint-disable-line security/detect-object-injection -- key is a local fixed string
    }
  }

  const sanitizedFrontendConfig = _.cloneDeep(frontendConfig)
  const {
    alert = {},
    costObjects = [],
    sla = {},
    addonDefinition = {},
    accessRestriction: {
      items = [],
    } = {},
    vendorHints = [],
    resourceQuotaHelp = '',
    controlPlaneHighAvailabilityHelp = '',
  } = sanitizedFrontendConfig

  convertAndSanitize(alert, 'message')
  for (const costObject of costObjects) {
    convertAndSanitize(costObject, 'description')
  }
  convertAndSanitize(sla, 'description')
  convertAndSanitize(addonDefinition, 'description')
  convertAndSanitize(resourceQuotaHelp, 'text')
  convertAndSanitize(controlPlaneHighAvailabilityHelp, 'text')

  for (const item of items) {
    const {
      display = {},
      input = {},
      options = [],
    } = item
    convertAndSanitize(display, 'description')
    convertAndSanitize(input, 'description')
    for (const option of options) {
      const {
        display = {},
        input = {},
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

export default router
