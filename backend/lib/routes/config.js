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
const metricsMiddleware = metricsRoute('config')

// cache sanitized config (value + in-flight promise)
let cachedFrontendConfig
let cachedFrontendConfigPromise

async function getFrontendConfig () {
  if (cachedFrontendConfig) {
    return cachedFrontendConfig
  }

  if (!cachedFrontendConfigPromise) {
    cachedFrontendConfigPromise = (async () => {
      try {
        const cfg = await sanitizeFrontendConfig(config.frontend)
        cachedFrontendConfig = cfg
        return cfg
      } catch (err) {
        cachedFrontendConfigPromise = undefined
        throw err
      }
    })()
  }
  return cachedFrontendConfigPromise
}

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const frontendConfig = await getFrontendConfig()

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

async function sanitizeFrontendConfig (frontendConfig) {
  const converter = createConverter()
  const tasks = []

  const convertAndSanitize = async (obj, key) => {
    const value = obj?.[key] // eslint-disable-line security/detect-object-injection -- key is a local fixed string
    if (value) {
      const html = await converter.makeSanitizedHtml(value)
      obj[key] = html // eslint-disable-line security/detect-object-injection -- key is a local fixed string
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
    resourceQuotaHelp = {},
    controlPlaneHighAvailabilityHelp = {},
  } = sanitizedFrontendConfig

  tasks.push(convertAndSanitize(alert, 'message'))

  for (const costObject of costObjects) {
    tasks.push(convertAndSanitize(costObject, 'description'))
  }

  tasks.push(convertAndSanitize(sla, 'description'))
  tasks.push(convertAndSanitize(addonDefinition, 'description'))
  tasks.push(convertAndSanitize(resourceQuotaHelp, 'text'))
  tasks.push(convertAndSanitize(controlPlaneHighAvailabilityHelp, 'text'))

  for (const item of items) {
    const {
      display = {},
      input = {},
      options = [],
    } = item
    tasks.push(convertAndSanitize(display, 'description'))
    tasks.push(convertAndSanitize(input, 'description'))
    for (const option of options) {
      const {
        display = {},
        input = {},
      } = option
      tasks.push(convertAndSanitize(display, 'description'))
      tasks.push(convertAndSanitize(input, 'description'))
    }
  }

  for (const vendorHint of vendorHints) {
    tasks.push(convertAndSanitize(vendorHint, 'message'))
  }

  await Promise.all(tasks)
  return sanitizedFrontendConfig
}

export default router
