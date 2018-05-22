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
const _ = require('lodash')
const logger = require('../../logger')
const webhookService = require('./service')

const router = module.exports = express.Router()

router.route('/')
  .post(async (req, res, next) => {
    try {
      const body = JSON.parse(req.body)

      const event = _.get(req.headers, 'x-github-event')
      const action = body.action
      const issue = _.get(body, 'issue')

      switch (event) {
        case 'issues':
          webhookService.processIssue({action, issue})
          break
        case 'issue_comment':
          const comment = _.get(body, 'comment')
          webhookService.processIssue({action, issue})
          webhookService.processComment({action, issue, comment})
          break
        default:
          logger.error(`unhandled event: ${event}`)
      }
      res.send()
    } catch (err) {
      next(err)
    }
  })
