//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.mjs'
import { metricsRoute } from '../middleware.mjs'
import config from '../config/index.js'
import utils from '../utils/index.js'
const { authorization } = services

const { encodeBase64 } = utils

const router = express.Router({
  mergeParams: true,
})

const metricsMiddleware = metricsRoute('user')
router.route('/subjectrules')
  .all(metricsMiddleware)
  .post(async (req, res, next) => {
    try {
      const user = req.user || {}
      const { namespace } = req.body
      const result = await authorization.selfSubjectRulesReview(user, namespace)
      res.send(result)
    } catch (err) {
      next(err)
    }
  })

router.route('/kubeconfig')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    const {
      apiServerUrl: server,
      apiServerCaData: certificateAuthorityData,
      apiServerSkipTlsVerify: insecureSkipTlsVerify,
      oidc = {},
      public: {
        clientId = oidc.client_id,
        clientSecret,
        usePKCE,
      } = {},
    } = config
    const body = {
      server,
      certificateAuthorityData,
      insecureSkipTlsVerify,
      oidc: {
        issuerUrl: oidc.issuer,
        clientId,
      },
    }
    if (clientSecret) {
      body.oidc.clientSecret = clientSecret
    }
    if (usePKCE || !clientSecret) {
      body.oidc.usePKCE = true
    }
    if (oidc.scope) {
      const extraScopes = []
      for (const scope of oidc.scope.split(' ')) {
        if (scope !== 'openid' && !scope.startsWith('audience:server:client_id')) {
          extraScopes.push(scope)
        }
      }
      if (extraScopes.length) {
        body.oidc.extraScopes = extraScopes
      }
    }
    if (oidc.ca) {
      body.oidc.certificateAuthorityData = encodeBase64(oidc.ca)
    } else if (oidc.rejectUnauthorized === false) {
      body.oidc.insecureSkipTlsVerify = true
    }
    res.send(body)
  })

export default router
