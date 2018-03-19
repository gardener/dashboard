//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const { infrastructureSecrets } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await infrastructureSecrets.list({user, namespace}))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await infrastructureSecrets.create({user, namespace, body}))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const bindingName = req.params.name
      const body = req.body
      res.send(await infrastructureSecrets.patch({user, namespace, bindingName, body}))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const bindingName = req.params.name
      res.send(await infrastructureSecrets.remove({user, namespace, bindingName}))
    } catch (err) {
      next(err)
    }
  })
