//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const { extend } = require('@gardener-dashboard/request')

const config = require('../config')
const logger = require('../logger')
const cache = require('../cache')

const {
  fgaApiUrl,
  fgaStoreId,
  fgaApiToken
} = config

const fgaClient = fgaApiUrl && fgaStoreId && fgaApiToken
  ? extend({
    url: `${fgaApiUrl}/stores/${fgaStoreId}`,
    responseType: 'json',
    auth: {
      bearer: fgaApiToken
    }
  })
  : null

async function listProjects (username, relation = 'viewer') {
  const type = 'gardener_project'
  const user = `user:${username}`
  const { objects = [] } = await fgaClient.request('list-objects', {
    method: 'POST',
    json: { user, relation, type }
  })
  logger.debug('Openfga response objects: %s', objects)
  const projects = []
  for (const object of objects) {
    const [prefix, namespace] = object.split(':')
    if (prefix === type) {
      try {
        const project = cache.findProjectByNamespace(namespace)
        projects.push(project.metadata.name)
      } catch (err) {
        logger.debug('Openfga gardener project "%s" not found', namespace)
      }
    }
  }
  return projects
}

module.exports = {
  client: fgaClient,
  listProjects
}
