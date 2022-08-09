//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { extend } = require('@gardener-dashboard/request')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const { version } = require('../../package')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const gardenerVersion = await fetchGardenerVersion()
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
        caBundle
      }
    } = await dashboardClient['apiregistration.k8s.io'].apiservices.get('v1beta1.core.gardener.cloud')
    const clientConfig = {
      url: `https://${service.name}.${service.namespace}`,
      extend (options) {
        return Object.assign(Object.create(this), options)
      }
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
