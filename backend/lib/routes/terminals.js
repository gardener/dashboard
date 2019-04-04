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
const { terminals } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/:target/:name?/')
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const target = req.params.target
      res.send(await terminals.create({ user, namespace, name, target }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:target/heartbeat/:name?/')
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const target = req.params.target
      res.send(await terminals.heartbeat({ user, namespace, name, target }))
    } catch (err) {
      next(err)
    }
  })
