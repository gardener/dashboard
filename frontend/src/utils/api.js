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

import axios from 'axios'

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

/* General Purpose */

function getResource (url) {
  return axios.get(url)
}

function deleteResource (url) {
  return axios.delete(url)
}

function createResource (url, data) {
  return callResourceMethod(url, data)
}

function updateResource (url, data) {
  return axios.put(url, data)
}

function patchResource (url, data) {
  return axios.patch(url, data)
}

function callResourceMethod (url, data) {
  return axios.post(url, data)
}

/* Infrastructures Secrets */

export function getInfrastructureSecrets ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/infrastructure-secrets`)
}

export function updateInfrastructureSecret ({ namespace, bindingName, data }) {
  namespace = encodeURIComponent(namespace)
  bindingName = encodeURIComponent(bindingName)
  return updateResource(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`, data)
}

export function createInfrastructureSecret ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return createResource(`/api/namespaces/${namespace}/infrastructure-secrets`, data)
}

export function deleteInfrastructureSecret ({ namespace, bindingName }) {
  namespace = encodeURIComponent(namespace)
  bindingName = encodeURIComponent(bindingName)
  return deleteResource(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`)
}

/* Shoot Clusters */

export function createShoot ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return createResource(`/api/namespaces/${namespace}/shoots`, data)
}

export function deleteShoot ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return deleteResource(`/api/namespaces/${namespace}/shoots/${name}`)
}

export function replaceShoot ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}`, data)
}

export function addShootAnnotation ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return patchResource(`/api/namespaces/${namespace}/shoots/${name}/metadata/annotations`, data)
}

export function getShootInfo ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}/info`)
}

export function getShootSeedInfo ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}/seed-info`)
}

export function getShootAddonKyma ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}/kyma`)
}

export function updateShootVersion ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`, data)
}

export function updateShootMaintenance ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/maintenance`, data)
}

export function updateShootHibernationSchedules ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/schedules`, data)
}

export function updateShootHibernation ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/enabled`, data)
}

export function updateShootWorkers ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/provider/workers`, data)
}

export function updateShootAddons ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/addons`, data)
}

export function updateShootPurpose ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/purpose`, data)
}

/* Cloud Profiles */

export function getCloudprofiles () {
  return getResource(`/api/cloudprofiles`)
}

/* Projects */

export function getProjects () {
  return getResource(`/api/namespaces`)
}

export function createProject ({ data }) {
  return createResource(`/api/namespaces`, data)
}

export function updateProject ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return updateResource(`/api/namespaces/${namespace}`, data)
}

export function deleteProject ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return deleteResource(`/api/namespaces/${namespace}`)
}

/* Members */

export function getMembers ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/members`)
}

export function addMember ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return createResource(`/api/namespaces/${namespace}/members`, data)
}

export function getMember ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/members/${name}`)
}

export function deleteMember ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return deleteResource(`/api/namespaces/${namespace}/members/${name}`)
}

/* User */
export function createTokenReview (data) {
  return createResource('/auth', data)
}

export function getPrivileges () {
  return getResource('/api/user/privileges')
}

export function getSubjectRules ({ namespace }) {
  return callResourceMethod('/api/user/subjectrules/', {
    namespace
  })
}

export function getToken () {
  return getResource('/api/user/token')
}

/* Info */
export function getInfo () {
  return getResource(`/api/info`)
}

/* Terminals */

export function createTerminal ({ namespace, name, target, body }) {
  return invokeTerminalMethod('create', { namespace, name, target, body })
}

export function fetchTerminalSession ({ namespace, name, target, body }) {
  return invokeTerminalMethod('fetch', { namespace, name, target, body })
}

export function deleteTerminal ({ namespace, name, target, body }) {
  return invokeTerminalMethod('remove', { namespace, name, target, body })
}

export function heartbeat ({ namespace, name, target, body }) {
  return invokeTerminalMethod('heartbeat', { namespace, name, target, body })
}

export function terminalConfig ({ namespace, name, target }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  target = encodeURIComponent(target)

  let pathname = `/api/namespaces/${namespace}/terminals/${target}`
  if (target !== 'garden') {
    pathname += `/${name}`
  }
  pathname += '/config'
  return getResource(pathname)
}

function invokeTerminalMethod (method, { namespace, name, target, body }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  target = encodeURIComponent(target)

  let pathname = `/api/namespaces/${namespace}/terminals/${target}`
  if (target !== 'garden') {
    pathname += `/${name}`
  }
  return callResourceMethod(pathname, {
    method,
    params: body
  })
}
