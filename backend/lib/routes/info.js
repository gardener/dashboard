//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const got = require('got')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')
const { dashboardClient, isHttpError } = require('../kubernetes-client')
const { version } = require('../../package')
const { canAccessOpenAPI } = require('../services/authorization')
const { Forbidden } = require('../errors')
const SwaggerParser = require('swagger-parser')
const router = module.exports = express.Router()
const _ = require('lodash')

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
    const uri = `https://${service.name}.${service.namespace}/version`
    const version = await got(uri, {
      ca: decodeBase64(caBundle),
      resolveBodyOnly: true,
      responseType: 'json'
    })
    return version
  } catch (err) {
    logger.warn(`Could not fetch gardener version. Error: ${err.message}`)
    if (isHttpError(err, 404)) {
      return undefined
    }
    throw err
  }
}

router.route('/shootspec')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const spec = await fetchShootSpec(user)
      res.send({ spec })
    } catch (err) {
      next(err)
    }
  })

let shootSpec // Cache, TODO: Need to update cache when apiserver gets updated

async function fetchShootSpec (user) {
  if (!await canAccessOpenAPI(user)) {
    throw new Forbidden('User is not allowed to fetch the Open API specification')
  }

  if (shootSpec) {
    return shootSpec
  }

  // Do not use client of user as the result gets cached and returned to other users
  const res = await dashboardClient.openAPI.get()
  const spec = await SwaggerParser.dereference(res)

  shootSpec = _.get(spec, ['definitions', 'com.github.gardener.gardener.pkg.apis.core.v1alpha1.Shoot'], {})
  return shootSpec
}
