//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { homedir } = require('os')
const { join } = require('path')
const { cloneDeep } = require('lodash')
const fnv = require('fnv-plus')

const { readFileSync } = jest.requireActual('fs')

function getSeed ({
  name,
  uid,
  region,
  kind,
  seedProtected = false,
  seedVisible = true,
  labels = {},
  withSecretRef = true
}) {
  uid = uid || `seed--${name}`
  const seed = {
    kind: 'Seed',
    metadata: {
      name,
      uid,
      labels
    },
    spec: {
      provider: {
        type: kind,
        region
      },
      dns: {
        ingressDomain: `ingress.${region}.${kind}.example.org`
      },
      taints: [],
      settings: {
        scheduling: {
          visible: seedVisible
        }
      }
    }
  }
  if (seedProtected) {
    seed.spec.taints.push({
      key: 'seed.gardener.cloud/protected'
    })
  }
  if (withSecretRef) {
    seed.spec.secretRef = {
      name: `seedsecret-${name}`,
      namespace: 'garden'
    }
  }

  return seed
}

function getCloudProfile (cloudProfileName, kind, seedSelector = {}) {
  const spec = {
    type: kind,
    seedSelector,
    kubernetes: {
      versions: [
        {
          version: '1.9.0'
        },
        {
          version: '1.8.5'
        }
      ]
    }
  }

  return {
    metadata: {
      name: cloudProfileName
    },
    spec
  }
}

function getQuota ({ name, namespace = 'garden-trial', scope = { apiVersion: 'v1', kind: 'Secret' }, clusterLifetimeDays = 14, cpu = '200' }) {
  return {
    metadata: {
      name,
      namespace
    },
    spec: {
      scope,
      clusterLifetimeDays,
      metrics: {
        cpu
      }
    }
  }
}

const cloudProfileList = [
  getCloudProfile('infra1-profileName', 'infra1'),
  getCloudProfile('infra1-profileName2', 'infra1', { providerTypes: ['infra2', 'infra3'] }),
  getCloudProfile('infra2-profileName', 'infra2'),
  getCloudProfile('infra3-profileName', 'infra3', { matchLabels: { foo: 'bar' } }),
  getCloudProfile('infra3-profileName2', 'infra3')
]

const seedList = [
  getSeed({ name: 'soil-infra1', region: 'foo-east', kind: 'infra1', seedProtected: true, seedVisible: false }),
  getSeed({ name: 'infra1-seed', region: 'foo-east', kind: 'infra1' }),
  getSeed({ name: 'infra1-seed2', region: 'foo-west', kind: 'infra1' }),
  getSeed({ name: 'infra3-seed', region: 'foo-europe', kind: 'infra3', labels: { 'test-unreachable': 'true', biz: 'baz' } }),
  getSeed({ name: 'infra4-seed-without-secretRef', region: 'foo-south', kind: 'infra1', withSecretRef: false }),
  getSeed({ name: 'infra3-seed-with-selector', region: 'foo-europe', kind: 'infra3', seedProtected: false, seedVisible: true, labels: { foo: 'bar' } }),
  getSeed({ name: 'infra3-seed-protected', region: 'foo-europe', kind: 'infra3', seedProtected: true }),
  getSeed({ name: 'infra3-seed-invisible', region: 'foo-europe', kind: 'infra3', seedProtected: false, seedVisible: false })
]

const quotaList = [
  getQuota({ name: 'trial-secret-quota', namespace: 'garden-trial' }),
  getQuota({ name: 'foo-quota1', namespace: 'garden-foo' }),
  getQuota({ name: 'foo-quota2', namespace: 'garden-foo' })
]

module.exports = {
  get mockFiles () {
    const GARDENER_CONFIG = join(homedir(), '.gardener', 'config.yaml')
    return {
      [GARDENER_CONFIG]: readFileSync(join(__dirname, 'config.yaml'), 'utf8'),
      '/etc/gardener/1/config.yaml': 'port: 1234',
      '/etc/gardener/2/config.yaml': 'port: 1234\nlogLevel: info'
    }
  },
  kube: {
    getApiServer (namespace, name, ingressDomain) {
      const hash = fnv.hash(`${name}.${namespace}`, 32).str()
      return `k-${hash}.${ingressDomain}`
    }
  },
  cloudprofiles: {
    create (...args) {
      return getCloudProfile(...args)
    },
    list () {
      return cloneDeep(cloudProfileList)
    }
  },
  seeds: {
    create (...args) {
      return getSeed(...args)
    },
    list () {
      return cloneDeep(seedList)
    }
  },
  quotas: {
    create (...args) {
      return getQuota(...args)
    },
    list () {
      return cloneDeep(quotaList)
    }
  }
}
