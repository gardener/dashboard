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

const _ = require('lodash')
const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources

function Authorization ({ auth }) {
  return kubernetes.authorization({ auth })
}

async function hasAuthorization (user, resourceAttributes) {
  if (!user) {
    return false
  }
  const { apiVersion, kind } = Resources.SelfSubjectAccessReview
  const body = {
    kind,
    apiVersion,
    spec: {
      resourceAttributes
    }
  }
  const response = await Authorization(user).selfsubjectaccessreviews.post({ body })
  return _.get(response, 'status.allowed', false)
}
exports.hasAuthorization = hasAuthorization

exports.isAdmin = function (user) {
  // if someone is allowed to delete shoots in all namespaces he is considered to be an administrator
  return hasAuthorization(user, {
    verb: 'delete',
    group: 'garden.sapcloud.io',
    resource: 'shoots'
  })
}

exports.canCreateProject = function (user) {
  return hasAuthorization(user, {
    verb: 'create',
    group: 'garden.sapcloud.io',
    resource: 'projects'
  })
}
