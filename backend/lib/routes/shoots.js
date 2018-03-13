//
// Copyright 2018 by The Gardener Authors.
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
const { shoots } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await shoots.create({user, namespace, body}))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await shoots.read({user, namespace, name}))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await shoots.remove({user, namespace, name}))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/info')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await shoots.info({user, namespace, name}))
    } catch (err) {
      next(err)
    }
  })
