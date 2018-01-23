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

const router = module.exports = express.Router()

router.route('/')
  .get((req, res, next) => {
    const username = req.user.email
    const client = req.client.getServiceAccountClient()
    return client
      .readProjects({username})
      .then(body => res.send(body))
      .catch(next)
  })
  .post((req, res, next) => {
    const username = req.user.email
    const body = req.body
    const client = req.client.getServiceAccountClient()
    return client
      .createProject({username}, {body})
      .then(body => res.send(body))
      .catch(next)
  })

router.route('/:namespace')
  .put((req, res, next) => {
    const username = req.user.email
    const name = req.params.namespace
    const body = req.body
    const client = req.client.getServiceAccountClient()
    return client
      .patchProject({name, username}, {body})
      .then(body => res.send(body))
      .catch(next)
  })
  .delete((req, res, next) => {
    const username = req.user.email
    const name = req.params.namespace
    const client = req.client.getServiceAccountClient()
    return client
      .deleteProject({name, username})
      .then(body => res.send(body))
      .catch(next)
  })
