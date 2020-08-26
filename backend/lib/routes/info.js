//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const express = require('express')
const { extend } = require('@gardener-dashboard/http-client')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')
const { dashboardClient, isHttpError } = require('@gardener-dashboard/kubernetes-client')
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
        caBundle
      }
    } = await dashboardClient['apiregistration.k8s.io'].apiservices.get('v1beta1.core.gardener.cloud')
    const client = extend({
      prefixUrl: `https://${service.name}.${service.namespace}`,
      ca: decodeBase64(caBundle),
      resolveBodyOnly: true,
      responseType: 'json'
    })
    const version = await client.request('version')
    return version
  } catch (err) {
    logger.warn(`Could not fetch gardener version. Error: ${err.message}`)
    if (isHttpError(err, 404)) {
      return undefined
    }
    throw err
  }
}
