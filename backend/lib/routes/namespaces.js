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
const { projects } = require('../services')
const { isAuthenticated } = require('../middleware')

const router = module.exports = express.Router()

router.route('/')
  .get(isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user
      const qs = req.query
      res.send(await projects.list({ user, qs }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const body = req.body
      res.send(await projects.create({ user, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:namespace')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await projects.read({ user, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      const body = req.body
      res.send(await projects.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await projects.remove({ user, name }))
    } catch (err) {
      next(err)
    }
  })
