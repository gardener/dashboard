//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')

const { extend } = require('@gardener-dashboard/request')

const config = require('../config')
const logger = require('../logger')
const cache = require('../cache')
const getPermissionMappings = require('./permissionMappings')

const {
  fgaApiUrl,
  fgaStoreId,
  fgaApiToken,
  fgaAuthorizationModelId,
} = config

const fgaClient = fgaApiUrl && fgaStoreId && fgaApiToken
  ? extend({
    url: `${fgaApiUrl}/stores/${fgaStoreId}`,
    responseType: 'json',
    auth: {
      bearer: fgaApiToken,
    },
  })
  : null

function writeProject (namespace, accountId) {
  return fgaClient.request('write', {
    method: 'POST',
    json: {
      writes: {
        tuple_keys: [
          {
            object: `gardener_project:${namespace}`,
            relation: 'parent',
            user: `account:${accountId}`,
          },
        ],
      },
    },
  })
}

function deleteProject (namespace, accountId) {
  return fgaClient.request('write', {
    method: 'POST',
    json: {
      deletes: {
        tuple_keys: [
          {
            object: `gardener_project:${namespace}`,
            relation: 'parent',
            user: `account:${accountId}`,
          },
        ],
      },
    },
  })
}

async function listProjects (username, relation = 'viewer') {
  const type = 'gardener_project'
  const { objects = [] } = await fgaClient.request('list-objects', {
    method: 'POST',
    json: {
      user: `user:${username}`,
      relation,
      type,
    },
  })
  logger.debug('OpenFGA list projects response objects: %s', objects)
  const projects = []
  for (const object of objects) {
    const [prefix, namespace] = object.split(':')
    if (prefix === type) {
      try {
        const project = cache.findProjectByNamespace(namespace)
        projects.push(project.metadata.name)
      } catch (err) {
        logger.debug('OpenFGA gardener project "%s" not found', namespace)
      }
    }
  }
  return projects
}

function batchCheck (checks) {
  const body = {
    checks,
  }

  if (fgaAuthorizationModelId) {
    body.authorization_model_id = fgaAuthorizationModelId
  }

  return fgaClient.request('batch-check', {
    method: 'POST',
    json: body,
  })
}

function getProjectName (namespace) {
  try {
    return cache.findProjectByNamespace(namespace).metadata.name
  } catch (err) {
    // ignore error when project is not found
    return null
  }
}

async function getDerivedResourceRules (username, namespace, accountId) {
  const projectName = getProjectName(namespace)
  const permissionMappings = getPermissionMappings(accountId, projectName)
  const checks = permissionMappings.map(({ relation, object }) => ({
    tuple_key: {
      user: `user:${username}`,
      relation,
      object,
    },
    correlation_id: relation,
  }))

  let fgaResult
  try {
    const response = await batchCheck(checks)
    fgaResult = response.result
    logger.debug('OpenFGA batch check result: %s', JSON.stringify(fgaResult))
  } catch (error) {
    logger.error('Error performing batch permission checks:', error)
    throw new Error('Error performing batch permission checks')
  }

  const isAllowed = ({ relation: correlationId }) => {
    return _.get(fgaResult, [correlationId, 'allowed'], false)
  }

  return _
    .chain(permissionMappings)
    .filter(isAllowed)
    .map(({ verbs, apiGroups, resources }) => ({ verbs, apiGroups, resources }))
    .value()
}

module.exports = {
  client: fgaClient,
  listProjects,
  writeProject,
  deleteProject,
  getDerivedResourceRules,
}
