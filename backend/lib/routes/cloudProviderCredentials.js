//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import httpErrors from 'http-errors'
import { metricsRoute } from '../middleware.js'
const { cloudProviderCredentials } = services
const { UnprocessableEntity } = httpErrors

const router = express.Router({
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
        case 'createDns':
          credentialOperation = cloudProviderCredentials.createDns
          break
        case 'createInfra':
          credentialOperation = cloudProviderCredentials.createInfra
          break
        case 'patchDns':
          credentialOperation = cloudProviderCredentials.patchDns
          break
        case 'patchInfra':
          credentialOperation = cloudProviderCredentials.patchInfra
          break
        case 'removeDns':
          credentialOperation = cloudProviderCredentials.removeDns
          break
        case 'removeInfra':
          credentialOperation = cloudProviderCredentials.removeInfra
          break
        default:
          throw new UnprocessableEntity(`${method} not allowed for cloud provider credentials`)
      }
      res.send(await credentialOperation.call(cloudProviderCredentials, { user, params }))
    } catch (err) {
      next(err)
    }
  })

export default router
