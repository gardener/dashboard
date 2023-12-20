//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const createError = require('http-errors')
const Client = require('@gardener-dashboard/kube-client/lib/Client')
const {
  seedName,
  soilName,
  firstSecretName,
  secondSecretName
} = require('./constants')
const helper = require('./helper')
const seeds = require('./seeds')
const shoots = require('./shoots')

const seedMap = new Map()

const mockGardenClusterServer = jest.fn().mockReturnValue(new URL('https://garden-apiserver:6443'))
const gardenClient = {
  cluster: Object.create(Object.prototype, {
    server: {
      enumerable: true,
      get: mockGardenClusterServer
    }
  }),
  core: {
    secrets: {
      list: jest.fn().mockImplementation(namespace => {
        return Promise.resolve({
          items: [
            { metadata: { namespace, name: firstSecretName } },
            { metadata: { namespace, name: secondSecretName } }
          ]
        })
      })
    }
  },
  'core.gardener.cloud': {
    seeds: {
      set (items) {
        seedMap.clear()
        for (const item of items) {
          seedMap.set(item.metadata.name, item)
        }
      },
      get: jest.fn().mockImplementation(name => {
        return Promise.resolve(seedMap.get(name))
      })
    },
    shoots: {
      get: jest.fn().mockImplementation((namespace, name) => {
        return Promise.resolve(shoots.get(namespace, name))
      }),
      listAllNamespaces: jest.fn().mockImplementation(query => {
        const fieldSelector = helper.parseFieldSelector(query.fieldSelector)
        const items = _
          .chain(shoots.list())
          .filter(shoot => shoot.metadata.namespace !== 'garden')
          .filter(fieldSelector)
          .tap(shoot => (delete shoot.kind))
          .value()
        return Promise.resolve({
          kind: 'ShootList',
          items
        })
      })
    }
  },
  'seedmanagement.gardener.cloud': {
    managedseeds: {
      get: jest.fn().mockImplementation((namespace, name) => {
        switch (name) {
          case seedName:
            return Promise.resolve({
              kind: 'ManagedSeed',
              metadata: { namespace, name },
              spec: {
                shoot: { name }
              },
              status: {}
            })
          default:
            return Promise.reject(createError(404, `ManagedSeed ${namespace}/${name} not found`))
        }
      })
    }
  },
  createKubeconfigClient: jest.fn().mockImplementation(secretRef => {
    switch (secretRef.name) {
      case firstSecretName:
        return Promise.resolve(hostClient)
      case `seedsecret-${soilName}`:
        return Promise.resolve(soilClient)
      default:
        return Promise.reject(new TypeError('Failed to create client for secretRef'))
    }
  }),
  createShootAdminKubeconfigClient: jest.fn().mockImplementation(shootRef => {
    switch (shootRef.name) {
      case seedName:
        return Promise.resolve(seedClient)
      default:
        return Promise.reject(new TypeError('Failed to create client for shootRef'))
    }
  })
}
gardenClient.getShoot = jest.fn().mockImplementation(Client.prototype.getShoot.bind(gardenClient))
gardenClient.getManagedSeed = jest.fn().mockImplementation(Client.prototype.getManagedSeed.bind(gardenClient))
gardenClient['core.gardener.cloud'].seeds.set(seeds.list())

const mockHostClusterServer = jest.fn().mockReturnValue(new URL('https://host-apiserver'))
const hostClient = {
  cluster: Object.create(Object.prototype, {
    server: {
      enumerable: true,
      get: mockHostClusterServer
    }
  }),
  core: {
    services: {
      create: jest.fn((...args) => Promise.resolve(args[1])),
      mergePatch: jest.fn((...args) => Promise.resolve(args[2]))
    },
    endpoints: {
      mergePatch: jest.fn((...args) => Promise.resolve(args[2])),
      delete: jest.fn()
    }
  },
  'networking.k8s.io': {
    ingresses: {
      create: jest.fn((...args) => Promise.resolve(args[1])),
      mergePatch: jest.fn((...args) => Promise.resolve(args[2]))
    }
  }
}

const mockSoilClusterServer = jest.fn().mockReturnValue(new URL('https://soil-apiserver:6443'))
const soilClient = {
  cluster: Object.create(Object.prototype, {
    server: {
      enumerable: true,
      get: mockSoilClusterServer
    }
  }),
  core: {
    services: {
      mergePatch: jest.fn((...args) => Promise.resolve(args[2]))
    },
    endpoints: {
      delete: jest.fn()
    }
  },
  'networking.k8s.io': {
    ingresses: {
      constructor: {
        group: 'networking.k8s.io',
        version: 'v1',
        names: { kind: 'Ingress' }
      },
      mergePatch: jest.fn((...args) => Promise.resolve(args[2]))
    }
  }
}

const mockSeedClusterServer = jest.fn().mockReturnValue(new URL('https://seed-apiserver:6443'))
const seedClient = {
  cluster: Object.create(Object.prototype, {
    server: {
      enumerable: true,
      get: mockSeedClusterServer
    }
  }),
  'networking.k8s.io': {
    ingresses: {
      mergePatch: jest.fn((...args) => Promise.resolve(args[2]))
    }
  }
}

const mockCreateKubeconfigClient = gardenClient.createKubeconfigClient
const mockCreateShootAdminKubeconfigClient = gardenClient.createShootAdminKubeconfigClient
const mockGetManagedSeed = gardenClient.getManagedSeed
const mockGetShoot = gardenClient.getShoot
const mockSecretsList = gardenClient.core.secrets.list
const mockSeedsGet = gardenClient['core.gardener.cloud'].seeds.get
const mockShootsGet = gardenClient['core.gardener.cloud'].shoots.get
const mockShootsListAllNamespaces = gardenClient['core.gardener.cloud'].shoots.listAllNamespaces
const mockManagedSeedsGet = gardenClient['seedmanagement.gardener.cloud'].managedseeds.get
const mockHostServicesCreate = hostClient.core.services.create
const mockHostServicesMergePatch = hostClient.core.services.mergePatch
const mockSoilServicesMergePatch = soilClient.core.services.mergePatch
const mockHostEndpointsMergePatch = hostClient.core.endpoints.mergePatch
const mockSoilEndpointsDelete = soilClient.core.endpoints.delete
const mockHostIngressesCreate = hostClient['networking.k8s.io'].ingresses.create
const mockHostIngressesMergePatch = hostClient['networking.k8s.io'].ingresses.mergePatch
const mockSoilIngressesMergePatch = soilClient['networking.k8s.io'].ingresses.mergePatch
const mockSeedIngressesMergePatch = seedClient['networking.k8s.io'].ingresses.mergePatch

const mocks = {
  mockCreateKubeconfigClient,
  mockCreateShootAdminKubeconfigClient,
  mockGetManagedSeed,
  mockGetShoot,
  mockSecretsList,
  mockSeedsGet,
  mockShootsGet,
  mockShootsListAllNamespaces,
  mockManagedSeedsGet,
  mockHostServicesCreate,
  mockHostServicesMergePatch,
  mockSoilServicesMergePatch,
  mockHostEndpointsMergePatch,
  mockSoilEndpointsDelete,
  mockHostIngressesCreate,
  mockHostIngressesMergePatch,
  mockSoilIngressesMergePatch,
  mockSeedIngressesMergePatch
}

module.exports = {
  gardenClient,
  mockGardenClusterServer,
  hostClient,
  mockHostClusterServer,
  soilClient,
  mockSoilClusterServer,
  seedClient,
  mockSeedClusterServer,
  mocks
}
