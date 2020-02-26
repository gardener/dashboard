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

'use strict'
const _ = require('lodash')
const { EventEmitter } = require('events')
const fnv = require('fnv-plus')
const { cache } = require('../../lib/cache')
const createJournalCache = require('../../lib/cache/journals')
const WatchBuilder = require('../../lib/kubernetes-client/WatchBuilder')

function getSeed (name, region, kind, seedProtected = false, seedVisible = true, labels = {}) {
  const seed = {
    kind: 'Seed',
    metadata: {
      name,
      labels
    },
    spec: {
      provider: {
        type: kind,
        region
      },
      secretRef: {
        name: `seedsecret-${name}`,
        namespace: 'garden'
      },
      dns: {
        ingressDomain: `ingress.${region}.${kind}.example.org`
      },
      taints: []
    }
  }
  if (seedProtected) {
    seed.spec.taints.push({
      key: 'seed.gardener.cloud/protected'
    })
  }
  if (!seedVisible) {
    seed.spec.taints.push({
      key: 'seed.gardener.cloud/invisible'
    })
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

function getKubeApiServer (namespace, name, ingressDomain) {
  const hash = fnv.hash(`${name}.${namespace}`, 32).str()
  return `k-${hash}.${ingressDomain}`
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
  getCloudProfile('infra2-profileName', 'infra2'),
  getCloudProfile('infra3-profileName', 'infra3', { matchLabels: { foo: 'bar' } }),
  getCloudProfile('infra3-profileName2', 'infra3')
]

const seedList = [
  getSeed('soil-infra1', 'foo-east', 'infra1', true, false),
  getSeed('infra1-seed', 'foo-east', 'infra1'),
  getSeed('infra1-seed2', 'foo-west', 'infra1'),
  getSeed('infra3-seed', 'foo-europe', 'infra3'),
  getSeed('infra3-seed-with-selector', 'foo-europe', 'infra3', false, true, { foo: 'bar' }),
  getSeed('infra3-seed-protected', 'foo-europe', 'infra3', true),
  getSeed('infra3-seed-invisible', 'foo-europe', 'infra3', false, false)
]

const quotaList = [
  getQuota({ name: 'trial-secret-quota', namespace: 'garden-trial' }),
  getQuota({ name: 'foo-quota1', namespace: 'garden-foo' }),
  getQuota({ name: 'foo-quota2', namespace: 'garden-foo' })
]

const stub = {
  getCloudProfiles (sandbox) {
    const getCloudProfilesStub = sandbox.stub(cache, 'getCloudProfiles')
    getCloudProfilesStub.returns(cloudProfileList)

    const getSeedsStub = sandbox.stub(cache, 'getSeeds')
    getSeedsStub.returns(seedList)
  },
  getQuotas (sandbox) {
    const getQuotasStub = sandbox.stub(cache, 'getQuotas')
    getQuotasStub.returns(quotaList)
  },
  getJournalCache (sandbox) {
    const getJournalCacheStub = sandbox.stub(cache, 'getJournalCache')
    const journalCache = createJournalCache()
    getJournalCacheStub.returns(journalCache)
    return journalCache
  }
}

class Reconnector extends EventEmitter {
  constructor () {
    super()
    this.disconnected = false
    this.events = []
  }

  disconnect () {
    this.disconnected = true
  }

  pushEvent (type, object, delay = 10) {
    this.events.push({ delay, event: { type, object } })
  }

  start () {
    const emit = (event) => {
      return () => {
        this.emit('event', event)
        process.nextTick(shift)
      }
    }
    const shift = () => {
      if (this.events.length) {
        const { delay, event } = this.events.shift()
        setTimeout(emit(event), delay)
      }
    }
    shift()
    return this
  }
}

function createReconnectorStub (events = [], name) {
  const reconnector = new Reconnector()
  _.forEach(events, args => reconnector.pushEvent(...args))
  reconnector.resourceName = name
  WatchBuilder.setWaitFor(reconnector)
  return reconnector
}

module.exports = {
  stub,
  createJournalCache,
  createReconnectorStub,
  getKubeApiServer,
  getSeed
}
