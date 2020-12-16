//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { cloneDeep, find } = require('lodash')

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

const seeds = {
  create (options) {
    return getSeed(options)
  },
  get (name) {
    return find(seeds.list(), ['metadata.name', name])
  },
  list () {
    return cloneDeep(seedList)
  }
}

module.exports = seeds
