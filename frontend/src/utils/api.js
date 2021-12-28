//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'

/* General Purpose */
async function toPlainResponseObject (response) {
  const { status, statusText } = response
  const contentType = response.headers.get('Content-Type')
  const headers = {}
  for (const [key, value] of response.headers.entries()) {
    headers[key] = value
  }
  let data
  if (contentType && typeof contentType === 'string') {
    const [mediaType] = contentType.split(';')
    switch (mediaType.trim()) {
      case 'application/json':
        data = await response.json()
        break
      default:
        data = await response.text()
        break
    }
  }
  return {
    status,
    statusText,
    headers,
    data
  }
}

async function request (method, url, data) {
  const options = {
    method,
    cache: 'no-cache',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
  if (data) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(data)
  }
  let response = await fetch(url, options)
  response = await toPlainResponseObject(response)
  const { status } = response
  if (status >= 200 && status < 300) {
    return response
  }
  const error = new Error(`Request failed with status code ${status}`)
  error.response = response
  throw error
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
  return getResource('/config.json')
}

/* CloudProviders Secrets */

export function getCloudProviderSecrets ({ namespace }) {
  namespace = encodeURIComponent(namespace)
  return getResource(`/api/namespaces/${namespace}/cloud-provider-secrets`)
}

export function updateCloudProviderSecret ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/cloud-provider-secrets/${name}`, data)
}

export function createCloudProviderSecret ({ namespace, data }) {
  namespace = encodeURIComponent(namespace)
  return createResource(`/api/namespaces/${namespace}/cloud-provider-secrets`, data)
}

export function deleteCloudProviderSecret ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return deleteResource(`/api/namespaces/${namespace}/cloud-provider-secrets/${name}`)
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

export function updateShootDns ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/dns`, data)
}

export async function getShootSchemaDefinition () {
  const definitions = await getResource('/api/openapi')
  return get(definitions, ['data', 'com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot'])
}

export function updateShootPurpose ({ namespace, name, data }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return updateResource(`/api/namespaces/${namespace}/shoots/${name}/spec/purpose`, data)
}

/* Cloud Profiles */

export function getCloudprofiles () {
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

export function rotateServiceAccountSecret ({ namespace, name }) {
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return callResourceMethod(`/api/namespaces/${namespace}/members/${name}`, {
    method: 'rotateSecret'
  })
}

/* User */
export function createTokenReview (data) {
  return createResource('/auth', data)
}

export function getPrivileges () {
  return getResource('/api/user/privileges')
}

export function getSubjectRules ({ namespace = 'default' }) {
  return callResourceMethod('/api/user/subjectrules/', {
    namespace
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
    target
  }
  return invokeTerminalMethod('create', body)
}

export function fetchTerminalSession ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target
  }
  return invokeTerminalMethod('fetch', body)
}

export function listTerminalSessions ({ namespace, body = {} }) {
  body.coordinate = {
    namespace
  }
  return invokeTerminalMethod('list', body)
}

export function deleteTerminal ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target
  }
  return invokeTerminalMethod('remove', body)
}

export function heartbeat ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target
  }
  return invokeTerminalMethod('heartbeat', body)
}

export function terminalConfig ({ namespace, name, target, body = {} }) {
  body.coordinate = {
    name,
    namespace,
    target
  }
  return invokeTerminalMethod('config', body)
}

function invokeTerminalMethod (method, body) {
  return callResourceMethod('/api/terminals', {
    method,
    params: body
  })
}

/* Terminal Shortcuts */

export function listProjectTerminalShortcuts ({ namespace, body = {} }) {
  body.coordinate = {
    namespace
  }
  return invokeTerminalMethod('listProjectTerminalShortcuts', body)
}

/* Controller Registrations */

export function getGardenerExtensions () {
  return getResource('/api/gardener-extensions')
}
