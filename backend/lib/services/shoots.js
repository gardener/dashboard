//
// Copyright 2018 by The Gardener Authors.
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

const kubernetes = require('../kubernetes')
const { decodeBase64 } = require('../utils')
const { getSeeds } = require('../cache')
const _ = require('lodash')

function Garden ({auth}) {
  return kubernetes.garden({auth})
}

function Core ({auth}) {
  return kubernetes.core({auth})
}

exports.list = async function ({user, namespace}) {
  return Garden(user).namespaces(namespace).shoots.get({})
}

exports.create = async function ({user, namespace, body}) {
  const username = user.id
  const finalizers = ['gardener']
  const annotations = {
    'garden.sapcloud.io/createdBy': username
  }
  body = _.merge({}, body, {metadata: {namespace, finalizers, annotations}})
  return Garden(user).namespaces(namespace).shoots.post({body})
}

exports.read = async function ({user, namespace, name}) {
  return Garden(user).namespaces(namespace).shoots.get({name})
}

function patch ({user, namespace, name, body}) {
  return Garden(user).namespaces(namespace).shoots.mergePatch({name, body})
}

exports.remove = async function ({user, namespace, name}) {
  await Garden(user).namespaces(namespace).shoots.delete({name})
  const {metadata} = await this.read({user, namespace, name})
  const body = {
    metadata: {
      annotations: {
        'confirmation.garden.sapcloud.io/deletionTimestamp': metadata.deletionTimestamp,
        'action.garden.sapcloud.io/delete': name
      }
    }
  }
  return patch({user, namespace, name, body})
}

exports.info = async function ({user, namespace, name}) {
  const [
    shoot,
    secret
  ] = await Promise.all([
    this.read({user, namespace, name}),
    Core(user).ns(namespace).secrets.get({name: `${name}.kubeconfig`})
  ])

  const seed = _.find(getSeeds(), ['metadata.name', shoot.spec.cloud.seed])

  const data = _
    .chain(secret)
    .get('data')
    .pick('kubeconfig', 'username', 'password')
    .map((value, key) => [key, decodeBase64(value)])
    .fromPairs()
    .value()
  data.serverUrl = kubernetes.fromKubeconfig(data.kubeconfig).url
  const ingressDomain = _.get(seed, 'spec.ingressDomain')
  const projectName = namespace.replace(/^garden-/, '')
  data.shootIngressDomain = `${name}.${projectName}.${ingressDomain}`
  return data
}
