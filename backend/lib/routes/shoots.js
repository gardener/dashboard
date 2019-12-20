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
const _ = require('lodash')
const config = require('../config')
const { shoots } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await shoots.list({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await shoots.create({ user, namespace, body }))
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
      res.send(await shoots.read({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replace({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await shoots.remove({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/kubernetes/version')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceVersion({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/maintenance')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceMaintenance({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/hibernation/enabled')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceHibernationEnabled({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/hibernation/schedules')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceHibernationSchedules({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/addons')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceAddons({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/cloud/:infrastructureKind/workers')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const infrastructureKind = req.params.infrastructureKind
      const body = req.body
      res.send(await shoots.replaceWorkers({ user, namespace, infrastructureKind, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/metadata/annotations')
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const annotations = req.body
      res.send(await shoots.patchAnnotations({ user, namespace, name, annotations }))
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
      res.send(await shoots.info({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })

if (_.get(config, 'frontend.features.kymaEnabled', false)) {
  router.route('/:name/kyma')
    .get(async (req, res, next) => {
      try {
        const user = req.user
        const namespace = req.params.namespace
        const name = req.params.name
        res.send(await shoots.kyma({ user, namespace, name }))
      } catch (err) {
        next(err)
      }
    })
}
