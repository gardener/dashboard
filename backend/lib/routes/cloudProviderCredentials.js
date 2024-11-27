//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { cloudProviderCredentials } = require('../services')
const { metricsRoute } = require('../middleware')
const { UnprocessableEntity } = require('http-errors')

const router = module.exports = express.Router({
  mergeParams: true,
})

const metricsMiddleware = metricsRoute('cloudProviderCredentials')

router.route('/')
  .all(metricsMiddleware)
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const { method, params } = req.body

      let credentialOperation
      switch (method) {
        case 'list':
          credentialOperation = cloudProviderCredentials.list
          break
        case 'create':
          credentialOperation = cloudProviderCredentials.create
          break
        case 'patch':
          credentialOperation = cloudProviderCredentials.patch
          break
        case 'remove':
          credentialOperation = cloudProviderCredentials.remove
          break
        default:
          throw new UnprocessableEntity(`${method} not allowed for cloud provider credentials`)
      }
      res.send(await credentialOperation.call(cloudProviderCredentials, { user, params }))
    } catch (err) {
      next(err)
    }
  })
