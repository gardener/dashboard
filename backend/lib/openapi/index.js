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

const { canGetOpenAPI } = require('../services/authorization')
const { Forbidden } = require('http-errors')
const SwaggerParser = require('swagger-parser')
const express = require('express')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const _ = require('lodash')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const schemaDefinitions = await getSchemaDefinitions(user)
      res.send(schemaDefinitions)
    } catch (err) {
      next(err)
    }
  })

const schemaDefinitions = {} // Cache, TODO: Need to update cache when apiserver gets updated

async function getSchemaDefinitions (user) {
  const hasAuthorization = await canGetOpenAPI(user)
  if (!hasAuthorization) {
    throw new Forbidden('User is not allowed to read OpenAPI schemas definitions')
  }

  if (_.isEmpty(schemaDefinitions)) {
    // Do not use client of user as the result gets cached and returned to other users
    const swaggerApi = await dashboardClient.openapi.get()
    const dereferencedSwaggerApi = await SwaggerParser.dereference(swaggerApi)

    const selectedSchemaDefinitions = _
      .chain(dereferencedSwaggerApi)
      .get('definitions')
      .pick([
        'com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot'
      ])
      .value()
    _.assign(schemaDefinitions, selectedSchemaDefinitions)
  }

  return schemaDefinitions
}
