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

const _ = require('lodash')
const kubernetes = require('../kubernetes')
const Resources = kubernetes.Resources
const rbac = kubernetes.rbac()

const ClusterRoleBindingName = 'garden-administrators'
const ClusterRoleResource = Resources.ClusterRole
const EmptyClusterRoleBinding = {
  metadata: {
    name: ClusterRoleBindingName
  },
  roleRef: {
    apiGroup: ClusterRoleResource.apiGroup,
    kind: ClusterRoleResource.kind,
    name: 'garden.sapcloud.io:system:project-member'
  },
  subjects: []
}

function readClusterRoleBinding () {
  return rbac.clusterrolebindings(ClusterRoleBindingName).get()
    .catch(err => {
      if (err.code === 404) {
        return EmptyClusterRoleBinding
      }
      throw err
    })
}

function fromResource ({subjects} = {}) {
  return _
    .chain(subjects)
    .filter(['kind', 'User'])
    .map('name')
    .value()
}

const list = async function () {
  const clusterRoleBinding = await readClusterRoleBinding()
  return fromResource(clusterRoleBinding)
}
exports.list = list

exports.isAdmin = async function (user) {
  if (!user) {
    return false
  }
  const admins = await list()
  const isAdmin = _.includes(admins, user.id)
  return isAdmin
}
