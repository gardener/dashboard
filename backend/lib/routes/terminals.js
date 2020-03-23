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
const { terminals, authorization } = require('../services')
const _ = require('lodash')

const router = module.exports = express.Router({
  mergeParams: true
})

router.use(async (req, res, next) => {
  try {
    const user = req.user

    const { method, params: body } = req.body

    const isAdmin = req.user.isAdmin = await authorization.isAdmin(user)

    terminals.ensureTerminalAllowed({ method, isAdmin, body })
    next()
  } catch (err) {
    next(err)
  }
})

router.route('/')
  .post(async (req, res, next) => {
    try {
      const user = req.user

      const { method, params: body } = req.body

      if (!_.includes(['create', 'fetch', 'list', 'config', 'remove', 'heartbeat'], method)) {
        throw new Error(`${method} not allowed for terminals`)
      }
      res.send(await terminals[method]({ user, body }))
    } catch (err) {
      next(err)
    }
  })
