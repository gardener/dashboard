//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import requestModule from '@gardener-dashboard/request'
import logger from '../logger/index.js'
import { decodeBase64 } from '../utils/index.js'
import kubeClientModule from '@gardener-dashboard/kube-client'
import { metricsRoute } from '../middleware.js'

const { extend } = requestModule
const { dashboardClient } = kubeClientModule

async function getVersionFromPackageJson () {
  const { default: packageJson } = await import('../../package.json', {
    with: { type: 'json' },
  })

  const { version } = packageJson
  return version
}

const router = express.Router()

const metricsMiddleware =
  metricsRoute('info')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const gardenerVersion = await fetchGardenerVersion()
      const version = await getVersionFromPackageJson()
      res.send({ version, gardenerVersion })
    } catch (err) {
      next(err)
    }
  })

async function fetchGardenerVersion () {
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

export default router
