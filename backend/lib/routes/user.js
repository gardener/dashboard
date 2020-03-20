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
