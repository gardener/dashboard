//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import createTicketCache from './tickets.js'
import {
  parseSelectors,
  filterBySelectors,
} from '../utils/index.js'
const { NotFound } = httpErrors

/*
  In file `lib/api.js` the synchronization is started with the privileged dashboardClient.
  Be careful when reading information from the cache that an authorization check is done
  or the information can be considered as not sensitive or public.
*/

class Cache extends Map {
  constructor () {
    super()
    this.ticketCache = createTicketCache()
  }

  getCloudProfiles () {
    return this.get('cloudprofiles').list()
  }

  getQuotas () {
    return this.get('quotas').list()
  }

  getSeeds () {
    return this.get('seeds').list()
  }

  getProjects () {
    return this.get('projects').list()
  }

  getShoots () {
    return this.get('shoots').list()
  }

  getControllerRegistrations () {
    return this.get('controllerregistrations').list()
  }

  getResourceQuotas () {
    return this.get('resourcequotas').list()
  }

  getTicketCache () {
    return this.ticketCache
  }
}

const caches = {}
export default function getCache (workspace) {
  const chacheID = workspace ?? 'default'

  let cache = _.get(caches, [chacheID])
  if (!cache) {
    cache = new Cache()
    _.set(caches, [chacheID], cache)
  }
  return {
    cache,
    initialize (informers) {
      for (const [key, informer] of Object.entries(informers)) {
        cache.set(key, informer.store)
      }
    },
    getCloudProfiles () {
      return cache.getCloudProfiles()
    },
    getQuotas () {
      return cache.getQuotas()
    },
    getSeeds () {
      return cache.getSeeds()
    },
    getSeed (name) {
      return _
        .chain(cache.getSeeds())
        .find(['metadata.name', name])
        .cloneDeep()
        .value()
    },
    getVisibleAndNotProtectedSeeds () {
      const predicate = item => {
        const taints = _.get(item, ['spec', 'taints'])
        const unprotected = !_.find(taints, ['key', 'seed.gardener.cloud/protected'])
        const visible = _.get(item, ['spec', 'settings', 'scheduling', 'visible'])
        return unprotected && visible
      }
      return _.filter(cache.getSeeds(), predicate)
    },
    getProject (name) {
      const project = cache.get('projects').find(['metadata.name', name])
      if (!project) {
        throw new NotFound(`Project with name '${name}' not found`)
      }
      return project
    },
    getProjectByUid (uid) {
      return cache.get('projects').find(['metadata.uid', uid])
    },
    getProjects () {
      return cache.getProjects()
    },
    getProjectNamespace (name) {
      return _
        .chain(cache.getProjects())
        .find(['metadata.name', name])
        .get(['spec', 'namespace'])
        .value()
    },
    getShoots (namespace, query = {}) {
      if (!namespace) {
        throw new TypeError('Namespace is required')
      }
      let items = cache.getShoots()
      if (namespace !== '_all') {
        items = items.filter(item => item.metadata.namespace === namespace)
      }
      const selectors = parseSelectors(query.labelSelector?.split(',') ?? [])
      if (selectors.length) {
        items = items.filter(filterBySelectors(selectors))
      }
      return items
    },
    getShoot (namespace, name) {
      return cache.get('shoots').find({ metadata: { namespace, name } })
    },
    getShootByUid (uid) {
      return cache.get('shoots').find(['metadata.uid', uid])
    },
    getControllerRegistrations () {
      return cache.getControllerRegistrations()
    },
    getResourceQuotas () {
      return cache.getResourceQuotas()
    },
    findProjectByNamespace (namespace) {
      const project = cache.get('projects').find(['spec.namespace', namespace])
      if (!project) {
        throw new NotFound(`Namespace '${namespace}' is not related to a gardener project`)
      }
      return project
    },
    getTicketCache () {
      return cache.getTicketCache()
    },
    getByUid (kind, uid) {
      switch (kind) {
        case 'Project':
          return this.getProjectByUid(uid)
        case 'Shoot':
          return this.getShootByUid(uid)
        default:
          throw new TypeError(`Kind '${kind}' not supported`)
      }
    },
  }
}
