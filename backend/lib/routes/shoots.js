//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { shoots } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const labelSelector = req.query.labelSelector
      res.send(await shoots.list({ user, namespace, labelSelector }))
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

router.route('/:name/spec/kubernetes/enableStaticTokenKubeconfig')
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

router.route('/:name/spec/controlPlane/highAvailability')
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

router.route('/:name/seed-info')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await shoots.seedInfo({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name/spec/purpose')
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
