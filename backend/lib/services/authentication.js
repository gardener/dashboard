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

const assert = require('assert').strict
const _ = require('lodash')
const { Unauthorized } = require('../errors')
const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources
const authentication = kubernetes.authentication()

exports.isAuthenticated = async function ({ token } = {}) {
  const { apiVersion, kind } = Resources.TokenReview
  const metadata = { name: `token-${Date.now()}` }
  const body = { kind, apiVersion, metadata, spec: { token } }
  const response = await authentication.tokenreviews.post({ body })
  if (_.get(response, 'status.authenticated', false) !== true) {
    const message = _.get(response, 'status.error')
    console.error('status', response.status)
    throw new Unauthorized(message)
  }
  const user = _.get(response, 'status.user')
  console.error('status', response.status)

  if (!_.has(user, 'username')) {
    assert.fail(`Token is authenticated but no username has been returned`)
  }
  return user
}
