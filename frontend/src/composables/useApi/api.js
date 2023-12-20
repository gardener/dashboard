//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import fetch from './fetch'

function request (method, url, data) {
  return fetch(url, { method, body: data })
}

function getResource (url) {
  return request('GET', url)
}

function deleteResource (url) {
  return request('DELETE', url)
}

function createResource (url, data) {
  return callResourceMethod(url, data)
}

async function updateResource (url, data) {
  return request('PUT', url, data)
}

async function patchResource (url, data) {
  return request('PATCH', url, data)
}

async function callResourceMethod (url, data) {
  return request('POST', url, data)
}

/* Configuration */

export function getConfiguration () {
  return getResource('/api/config')
}

/* CloudProviders Secrets */

export function getCloudProviderSecrets ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/cloudprovidersecrets`)
}

export function updateCloudProviderSecret ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/cloudprovidersecrets/${name}`, data)
}

export function createCloudProviderSecret ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return createResource(`/api/namespaces/${namespace}/cloudprovidersecrets`, data)
}

export function deleteCloudProviderSecret ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return deleteResource(`/api/namespaces/${namespace}/cloudprovidersecrets/${name}`)
}

/* Tickets */

export function getIssues ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/tickets`)
}

export function getIssuesAndComments ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/tickets/${name}`)
}

/* Shoot Clusters */

export function getShoots ({ namespace, labelSelector }) {
  const search = labelSelector
    ? '?' + new URLSearchParams({ labelSelector }).toString()
    : ''
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/shoots` + search)
}

export function getShoot ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return getResource(`/api/namespaces/${namespace}/shoots/${name}`)
}

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

export function updateShootVersion ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`, data)
}

export function updateShootEnableStaticTokenKubeconfig ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/enableStaticTokenKubeconfig`, data)
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

export function patchShootProvider ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return patchResource(`/api/namespaces/${namespace}/shoots/${name}/spec/provider`, data)
}

export function updateShootAddons ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/addons`, data)
}

export function updateShootControlPlaneHighAvailability ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/controlPlane/highAvailability`, data)
}

export function updateShootDns ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/dns`, data)
}

export async function getShootSchemaDefinition () {
  const { data = {} } = await getResource('/api/openapi')
  return data['com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot']
}

export function updateShootPurpose ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/purpose`, data)
}

export function updateShootSeedName ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/seedname`, data)
}

export function createShootAdminKubeconfig ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return createResource(`/api/namespaces/${namespace}/shoots/${name}/adminkubeconfig`, data)
}

/* Cloud Profiles */

export function getCloudProfiles () {
  return getResource('/api/cloudprofiles')
}

/* Seeds */

export function getSeeds () {
  return getResource('/api/seeds')
}

/* Projects */

export function getProjects () {
  return getResource('/api/namespaces')
}

export function createProject ({ data }) {
  return createResource('/api/namespaces', data)
}

export function patchProject ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return patchResource(`/api/namespaces/${namespace}`, data)
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

export function updateMember ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/members/${name}`, data)
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

export function resetServiceAccount ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return callResourceMethod(`/api/namespaces/${namespace}/members/${name}`, {
    method: 'resetServiceAccount',
  })
}

/* User */
export function createTokenReview (data) {
  return createResource('/auth', data)
}

export function getSubjectRules ({ namespace = 'default' }) {
  return callResourceMethod('/api/user/subjectrules', {
    namespace,
  })
}

export function getToken () {
  return getResource('/api/user/token')
}

export function getKubeconfigData () {
  return getResource('/api/user/kubeconfig')
}

/* Info */
export function getInfo () {
  return getResource('/api/info')
}

/* Terminals */
export function createTerminal ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target,
  }
  return invokeTerminalMethod('create', body)
}

export function fetchTerminalSession ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target,
  }
  return invokeTerminalMethod('fetch', body)
}

export function listTerminalSessions ({ namespace, body = {} }) {
  body.coordinate = {
    namespace,
  }
  return invokeTerminalMethod('list', body)
}

export function deleteTerminal ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target,
  }
  return invokeTerminalMethod('remove', body)
}

export function heartbeat ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target,
  }
  return invokeTerminalMethod('heartbeat', body)
}

export function terminalConfig ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target,
  }
  return invokeTerminalMethod('config', body)
}

function invokeTerminalMethod (method, body) {
  return callResourceMethod('/api/terminals', {
    method,
    params: body,
  })
}

/* Terminal Shortcuts */

export function listProjectTerminalShortcuts ({ namespace, body = {} }) {
  body.coordinate = {
    namespace,
  }
  return invokeTerminalMethod('listProjectTerminalShortcuts', body)
}

/* Controller Registrations */

export function getGardenerExtensions () {
  return getResource('/api/gardenerextensions')
}

/* Resource Quotas */

export function getResourceQuotas ({ namespace }) {
  return getResource(`/api/namespaces/${namespace}/resourcequotas`)
}

export default {
  getConfiguration,
  getCloudProviderSecrets,
  updateCloudProviderSecret,
  createCloudProviderSecret,
  deleteCloudProviderSecret,
  getIssues,
  getIssuesAndComments,
  getShoots,
  getShoot,
  createShoot,
  deleteShoot,
  replaceShoot,
  addShootAnnotation,
  getShootInfo,
  updateShootVersion,
  updateShootEnableStaticTokenKubeconfig,
  updateShootMaintenance,
  updateShootHibernationSchedules,
  updateShootHibernation,
  patchShootProvider,
  updateShootAddons,
  updateShootDns,
  getShootSchemaDefinition,
  updateShootPurpose,
  updateShootSeedName,
  createShootAdminKubeconfig,
  getCloudProfiles,
  getSeeds,
  getProjects,
  createProject,
  patchProject,
  updateProject,
  deleteProject,
  getMembers,
  addMember,
  updateMember,
  getMember,
  deleteMember,
  resetServiceAccount,
  createTokenReview,
  getSubjectRules,
  getToken,
  getKubeconfigData,
  getInfo,
  createTerminal,
  fetchTerminalSession,
  listTerminalSessions,
  deleteTerminal,
  heartbeat,
  terminalConfig,
  listProjectTerminalShortcuts,
  getGardenerExtensions,
  getResourceQuotas,
  updateShootControlPlaneHighAvailability,
}
