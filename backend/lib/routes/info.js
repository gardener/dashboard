//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { extend } = require('@gardener-dashboard/request')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')
const { createDashboardClient } = require('@gardener-dashboard/kube-client')
const { version } = require('../../package')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router()

const metricsMiddleware = metricsRoute('info')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const gardenerVersion = await fetchGardenerVersion(req.user)
      res.send({ version, gardenerVersion })
    } catch (err) {
      next(err)
    }
  })

async function fetchGardenerVersion (user) {
  const dashboardClient = createDashboardClient(user.workspace)
  try {
    const {
      spec: {
        service,
        insecureSkipTLSVerify,
        caBundle,
      },
    } = await dashboardClient['apiregistration.k8s.io'].apiservices.get('v1beta1.core.gardener.cloud')
    const clientConfig = {
      url: `https://${service.name}.${service.namespace}`,
      extend (options) {
        return Object.assign(Object.create(this), options)
      },
    }
    if (caBundle) {
      clientConfig.ca = decodeBase64(caBundle)
    } else if (process.env.NODE_ENV !== 'production' && insecureSkipTLSVerify === true) {
      clientConfig.rejectUnauthorized = false
    }
    const client = extend(clientConfig.extend({ responseType: 'json' }))
    const version = await client.request('version')
    return version
  } catch (err) {
    logger.warn(`Could not fetch gardener version. Error: ${err.message}`)
  }
}
