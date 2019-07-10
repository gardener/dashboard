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
  return axios.post(url, data)
}

function updateResource (url, data) {
  return axios.put(url, data)
}

function patchResource (url, data) {
  return axios.patch(url, data)
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

export function getShoot ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}`)
}

export function getShootInfo ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}/info`)
}

export function updateShootVersion ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`, data)
}

export function updateMaintenance ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/maintenance`, data)
}

export function updateHibernationSchedules ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/schedules`, data)
}

export function updateShootHibernation ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/enabled`, data)
}

export function updateWorkers ({ namespace, name, infrastructureKind, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  infrastructureKind = encodeURIComponent(infrastructureKind)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/cloud/${infrastructureKind}/workers`, data)
}

/* Cloud Profiles */

export function getCloudprofiles () {
  return getResource(`/api/cloudprofiles`)
}

/* Domains */

export function getDomains () {
  return getResource(`/api/domains`)
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

export function getToken () {
  return getResource('/api/user/token')
}

/* Status Info */
export function getInfo () {
  return getResource(`/api/info`)
}
