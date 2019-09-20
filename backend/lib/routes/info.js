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
const kubernetes = require('../kubernetes')
const { version } = require('../../package')
const SwaggerParser = require('swagger-parser')
const apiRegistration = kubernetes.apiRegistration()
const router = module.exports = express.Router()
const _ = require('lodash')

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const gardenerVersion = await fetchGardenerVersion()
      res.send({ version, gardenerVersion, user })
    } catch (err) {
      next(err)
    }
  })

async function fetchGardenerVersion () {
  try {
    const { spec: { service, caBundle } } = await apiRegistration.apiservices.get({
      name: 'v1beta1.garden.sapcloud.io'
    })
    const uri = `https://${service.name}.${service.namespace}/version`
    const { body: version } = await got(uri, {
      ca: decodeBase64(caBundle),
      json: true
    })
    return version
  } catch (err) {
    logger.warn(`Could not fetch gardener version. Error: ${err.message}`)
    if (err.code === 'ENOTFOUND' || err.code === 404 || err.statusCode === 404) {
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
  if (shootSpec) {
    return shootSpec
  }
  try {
    const { url, ca } = kubernetes.config()
    console.log(user)

    const { body } = await got(`${url}/openapi/v2`, {
      ca,
      headers: {
        Authorization: `Bearer ${user.auth.bearer}`
      },
      json: true
    })
    const spec = await SwaggerParser.dereference(body)
    shootSpec = _.get(spec, ['definitions', 'com.github.gardener.gardener.pkg.apis.garden.v1beta1.Shoot'], {})
    return shootSpec
  } catch (err) {
    logger.warn(`Could not fetch shoot spec. Error: ${err.message}`)
    if (err.code === 'ENOTFOUND' || err.code === 404 || err.statusCode === 404) {
      return undefined
    }
    throw err
  }
}
