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

/* General Purpose */

function getAuthorization (user) {
  return new Promise((resolve, reject) => {
    if (!user) {
      reject(new TypeError('Argument \'user\' must not be null'))
    } else {
      resolve({
        Authorization: `Bearer ${user.id_token}`
      })
    }
  })
}

function getResource (url, user) {
  return getAuthorization(user)
    .then((headers) => axios.get(url, { headers }))
}

function deleteResource (url, user) {
  return getAuthorization(user)
    .then((headers) => axios.delete(url, { headers }))
}

function createResource (url, user, data) {
  return getAuthorization(user)
    .then((headers) => axios.post(url, data, { headers }))
}

function updateResource (url, user, data) {
  return getAuthorization(user)
    .then((headers) => axios.put(url, data, { headers }))
}

function patchResource (url, user, data) {
  return getAuthorization(user)
    .then((headers) => axios.patch(url, data, { headers }))
}

/* Infrastructures Secrets */

export function getInfrastructureSecrets ({ namespace, user }) {
  return getResource(`/api/namespaces/${namespace}/infrastructure-secrets`, user)
}

export function updateInfrastructureSecret ({ namespace, bindingName, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`, user, data)
}

export function createInfrastructureSecret ({ namespace, user, data }) {
  return createResource(`/api/namespaces/${namespace}/infrastructure-secrets`, user, data)
}

export function deleteInfrastructureSecret ({ namespace, bindingName, user }) {
  return deleteResource(`/api/namespaces/${namespace}/infrastructure-secrets/${bindingName}`, user)
}

/* Shoot Clusters */

export function createShoot ({ namespace, user, data }) {
  return createResource(`/api/namespaces/${namespace}/shoots`, user, data)
}

export function deleteShoot ({ namespace, name, user }) {
  return deleteResource(`/api/namespaces/${namespace}/shoots/${name}`, user)
}

export function replaceShoot ({ namespace, name, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}`, user, data)
}

export function addShootAnnotation ({ namespace, name, user, data }) {
  return patchResource(`/api/namespaces/${namespace}/shoots/${name}/metadata/annotations`, user, data)
}

export function getShoot ({ namespace, name, user }) {
  return getResource(`/api/namespaces/${namespace}/shoots/${name}`, user)
}

export function getShootInfo ({ namespace, name, user }) {
  return getResource(`/api/namespaces/${namespace}/shoots/${name}/info`, user)
}

export function updateShootVersion ({ namespace, name, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`, user, data)
}

export function updateMaintenance ({ namespace, name, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/maintenance`, user, data)
}

export function updateHibernationSchedules ({ namespace, name, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/schedules`, user, data)
}

export function updateShootHibernation ({ namespace, name, user, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/enabled`, user, data)
}

export function updateWorkers ({ namespace, name, user, infrastructureKind, data }) {
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/cloud/${infrastructureKind}/workers`, user, data)
}

/* Cloud Profiles */

export function getCloudprofiles ({ user }) {
  return getResource(`/api/cloudprofiles`, user)
}

/* Domains */

export function getDomains ({ user }) {
  return getResource(`/api/domains`, user)
}

/* Projects */

export function getProjects ({ user }) {
  return getResource(`/api/namespaces`, user)
}

export function createProject ({ user, data }) {
  return createResource(`/api/namespaces`, user, data)
}

export function updateProject ({ namespace, user, data }) {
  return updateResource(`/api/namespaces/${namespace}`, user, data)
}

export function deleteProject ({ namespace, user }) {
  return deleteResource(`/api/namespaces/${namespace}`, user)
}

/* Members */

export function getMembers ({ namespace, user }) {
  return getResource(`/api/namespaces/${namespace}/members`, user)
}

export function addMember ({ namespace, user, data }) {
  return createResource(`/api/namespaces/${namespace}/members`, user, data)
}

export function getMember ({ namespace, name, user }) {
  return getResource(`/api/namespaces/${namespace}/members/${name}`, user)
}

export function deleteMember ({ namespace, name, user }) {
  return deleteResource(`/api/namespaces/${namespace}/members/${name}`, user)
}

/* User */

export function getUserInfo ({ user }) {
  return getResource(`/api/user`, user)
}

export function getInfo ({ user }) {
  return getResource(`/api/info`, user)
}
