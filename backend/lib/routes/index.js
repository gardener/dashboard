//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const _ = require('lodash')
const logger = require('../logger')
const { decodeBase64 } = require('../utils')
const kubernetes = require('../kubernetes')
const { version } = require('../../package')

const router = module.exports = express.Router()

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
    const apiServer = await kubernetes.apiregistration().apis['apiregistration.k8s.io'].v1beta1.apiservices('v1beta1.garden.sapcloud.io').get()
    const service = _.get(apiServer, 'body.spec.service')
    const ca = decodeBase64(_.get(apiServer, 'body.spec.caBundle'))
    if (service && ca) {
      const uri = `https://${service.name}.${service.namespace}/version`
      const res = await got(uri, { ca })
      const body = _.get(res, 'body')
      return JSON.parse(body)
    }
  } catch (err) {
    logger.warn(`Could not fetch gardener version. Error: ${err.message}`)
    if (err.code === 'ENOTFOUND') {
      return undefined
    }
    throw err
  }
}

module.exports = {
  '/info': router,
  '/user': require('./userInfo'),
  '/cloudprofiles': require('./cloudprofiles'),
  '/domains': require('./domains'),
  '/shoots': require('./shoots'),
  '/namespaces': require('./namespaces'),
  '/namespaces/:namespace/shoots': require('./shoots'),
  '/namespaces/:namespace/infrastructure-secrets': require('./infrastructureSecrets'),
  '/namespaces/:namespace/members': require('./members'),
  '/namespaces/:namespace/terminals': require('./terminals')
}
