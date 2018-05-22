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
const Resources = require('../kubernetes/Resources')

const RoleBindingName = 'garden-project-members'

function Rbac ({auth}) {
  return kubernetes.rbac({auth})
}

function fromResource ({subjects} = {}) {
  return _
    .chain(subjects)
    .filter(['kind', 'User'])
    .map('name')
    .value()
}

function roleBindingBody (namespace, usernames = []) {
  const ClusterRole = Resources.ClusterRole
  return {
    metadata: {
      name: RoleBindingName,
      namespace,
      labels: {
        'garden.sapcloud.io/role': 'members'
      }
    },
    roleRef: {
      apiGroup: ClusterRole.apiGroup,
      kind: ClusterRole.kind,
      name: 'garden.sapcloud.io:system:project-member'
    },
    subjects: _.map(usernames, name => {
      return {
        kind: 'User',
        name,
        apiGroup: 'rbac.authorization.k8s.io'
      }
    })
  }
}

function readRoleBinding (rbac, namespace) {
  return rbac.namespaces(namespace).rolebindings.get({
    name: RoleBindingName
  })
    .catch(err => {
      if (err.code === 404) {
        return roleBindingBody(namespace)
      }
      throw err
    })
}

function createRoleBinding (rbac, namespace, names = []) {
  return rbac.namespaces(namespace).rolebindings.post({
    body: roleBindingBody(namespace, names)
  })
}

async function setRoleBindingSubject (rbac, namespace, name) {
  let body
  try {
    body = await rbac.namespaces(namespace).rolebindings.get({
      name: RoleBindingName
    })
  } catch (err) {
    if (err.code === 404) {
      // only administrators can create the rolebinding afterwards
      return createRoleBinding(rbac, namespace, [name])
    }
    throw err
  }
  const subjects = body.subjects = body.subjects || []
  if (_.find(subjects, ['name', name])) {
    return body
  }
  subjects.push({
    kind: 'User',
    name,
    apiGroup: 'rbac.authorization.k8s.io'
  })
  return rbac.namespaces(namespace).rolebindings.mergePatch({
    name: RoleBindingName,
    body
  })
}

async function unsetRoleBindingSubject (rbac, namespace, name) {
  let body
  try {
    body = await rbac.namespaces(namespace).rolebindings.get({
      name: RoleBindingName
    })
  } catch (err) {
    if (err.code === 404) {
      return roleBindingBody(namespace)
    }
    throw err
  }
  const subjects = body.subjects = body.subjects || []
  if (!_.find(subjects, ['name', name])) {
    return body
  }
  _.remove(subjects, ['name', name])
  return rbac.namespaces(namespace).rolebindings.mergePatch({
    name: RoleBindingName,
    body
  })
}

// bootstrap of rolebinding must be done with the serviceaccount
exports.bootstrap = async function ({user, namespace}) {
  const rbac = kubernetes.rbac()
  return fromResource(await createRoleBinding(rbac, namespace, [user.id]))
}

// list, create and remove is done with the user
exports.list = async function ({user, namespace}) {
  const rbac = Rbac(user)
  return fromResource(await readRoleBinding(rbac, namespace))
}

exports.create = async function ({user, namespace, body: {name: username}}) {
  const rbac = Rbac(user)
  return fromResource(await setRoleBindingSubject(rbac, namespace, username))
}

exports.remove = async function ({user, namespace, name: username}) {
  const rbac = Rbac(user)
  return fromResource(await unsetRoleBindingSubject(rbac, namespace, username))
}
