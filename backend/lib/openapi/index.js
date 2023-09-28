//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { canGetOpenAPI } = require('../services/authorization')
const { Forbidden } = require('http-errors')
const SwaggerParser = require('@apidevtools/swagger-parser')
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
    const openAPIRaw = await dashboardClient.openapi.getGardenerV1Beta1()
    const dereferencedOpenApi = await SwaggerParser.dereference(openAPIRaw)

    const selectedSchemaDefinitions = _
      .chain(dereferencedOpenApi)
      .get('components')
      .get('schemas')
      .pick([
        'com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot'
      ])
      .value()
    _.assign(schemaDefinitions, selectedSchemaDefinitions)
  }

  return schemaDefinitions
}
