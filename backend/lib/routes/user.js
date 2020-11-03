//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')

const config = require('../config')
const { encodeBase64 } = require('../utils')
const { authorization } = require('../services')
const router = module.exports = express.Router({
  mergeParams: true
})

function getToken ({ auth = {} } = {}) {
  return auth.bearer
}

router.route('/privileges')
  .get(async (req, res, next) => {
    try {
      const user = req.user || {}
      const isAdmin = await authorization.isAdmin(user)
      res.send({
        isAdmin
      })
    } catch (err) {
      next(err)
    }
  })

router.route('/subjectrules')
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
  .get(async (req, res, next) => {
    const token = getToken(req.user)
    res.send({
      token
    })
  })

router.route('/kubeconfig')
  .get(async (req, res, next) => {
    const {
      apiServerUrl: server,
      apiServerCaData: certificateAuthorityData,
      apiServerSkipTlsVerify: insecureSkipTlsVerify,
      oidc = {}
    } = config
    const {
      issuer: issuerUrl,
      public: { clientId, clientSecret } = {}
    } = oidc
    const body = {
      server,
      certificateAuthorityData,
      insecureSkipTlsVerify,
      oidc: {
        issuerUrl,
        clientId,
        clientSecret
      }
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
