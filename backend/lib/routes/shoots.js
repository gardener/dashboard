//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { shoots } = require('../services')
const { metricsRoute } = require('../middleware')
const { trimObjectMetadata } = require('../utils')

const router = module.exports = express.Router({
  mergeParams: true
})

const metricsMiddleware = metricsRoute('shoots')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const labelSelector = req.query.labelSelector
      const shootList = await shoots.list({ user, namespace, labelSelector })
      for (const object of shootList.items) {
        trimObjectMetadata(object)
      }
      res.send(shootList)
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

router
  .route('/:name')
  .all(metricsMiddleware)
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

router.route('/:name/spec/kubernetes/enableStaticTokenKubeconfig')
  .all(metricsMiddleware)
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceEnableStaticTokenKubeconfig({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/kubernetes/version')
  .all(metricsMiddleware)
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
  .all(metricsMiddleware)
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
  .all(metricsMiddleware)
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
  .all(metricsMiddleware)
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
  .all(metricsMiddleware)
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

router.route('/:name/spec/controlPlane/highAvailability')
  .all(metricsMiddleware)
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceControlPlaneHighAvailability({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/dns')
  .all(metricsMiddleware)
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceDns({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/provider')
  .all(metricsMiddleware)
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.patchProvider({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/metadata/annotations')
  .all(metricsMiddleware)
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
  .all(metricsMiddleware)
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

router.route('/:name/spec/purpose')
  .all(metricsMiddleware)
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replacePurpose({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/seedName')
  .all(metricsMiddleware)
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.replaceSeedName({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/adminkubeconfig')
  .all(metricsMiddleware)
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await shoots.createAdminKubeconfig({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })
