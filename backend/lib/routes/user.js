//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')

const config = require('../config')
const { encodeBase64 } = require('../utils')
const { authorization } = require('../services')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router({
  mergeParams: true
})

const metricsMiddleware = metricsRoute('user')

function getToken ({ auth = {} } = {}) {
  return auth.bearer
}

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

router.route('/token')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    const token = getToken(req.user)
    res.send({
      token
    })
  })

router.route('/kubeconfig')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    const {
      apiServerUrl: server,
      apiServerCaData: certificateAuthorityData,
      apiServerSkipTlsVerify: insecureSkipTlsVerify,
      oidc = {}
    } = config
    const {
      issuer: issuerUrl,
      public: {
        clientId = oidc.client_id,
        clientSecret,
        usePKCE
      } = {}
    } = oidc
    const body = {
      server,
      certificateAuthorityData,
      insecureSkipTlsVerify,
      oidc: {
        issuerUrl,
        clientId
      }
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
