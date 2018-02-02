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

const _ = require('lodash')
const { UnprocessableEntity, PreconditionFailed } = require('../errors')
const Resources = require('../kubernetes/Resources')
const { decodeBase64, encodeBase64 } = require('../utils')
const kubernetes = require('../kubernetes')
const shoots = require('./shoots')
const whitelistedPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl']

function Core ({auth}) {
  return kubernetes.core({auth})
}

function fromResource ({metadata, data}) {
  const role = 'infrastructure'
  const labels = metadata.labels || {}
  const infrastructure = {
    kind: labels['infrastructure.garden.sapcloud.io/kind']
  }
  metadata = _
    .chain(metadata)
    .pick(['namespace', 'name', 'resourceVersion'])
    .assign({role, infrastructure})
    .value()
  const iteratee = (value, key) => {
    value = decodeBase64(value)
    if (!_.includes(whitelistedPropertyKeys, key)) {
      value = '****************'
    }
    return value
  }
  data = _.mapValues(data, iteratee)
  return {metadata, data}
}

function toResource ({metadata, data}) {
  const resource = Resources.Secret
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const infrastructure = metadata.infrastructure || {}
  const labels = {
    'garden.sapcloud.io/role': 'infrastructure',
    'infrastructure.garden.sapcloud.io/kind': infrastructure.kind
  }
  metadata = _
    .chain(metadata)
    .pick(['namespace', 'name', 'resourceVersion'])
    .assign({labels})
    .value()
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw new UnprocessableEntity('Failed to encode "base64" secret data')
  }
  return {apiVersion, kind, metadata, data}
}

exports.list = async function ({user, namespace}) {
  const qs = {
    labelSelector: 'garden.sapcloud.io/role=infrastructure'
  }
  const {items} = await Core(user).namespaces(namespace).secrets.get({qs})
  return _.map(items, fromResource)
}

exports.create = async function ({user, namespace, body}) {
  body = toResource(body)
  body = await Core(user).namespaces(namespace).secrets.post({body})
  return fromResource(body)
}

exports.read = async function ({user, namespace, name}) {
  const body = await Core(user).namespaces(namespace).secrets(name).get()
  return fromResource(body)
}

exports.patch = async function ({user, namespace, name, body}) {
  body = toResource(body)
  body = await Core(user).namespaces(namespace).secrets(name).mergePatch({body})
  return fromResource(body)
}

exports.remove = async function ({user, namespace, name}) {
  const {items: shootList} = await shoots.list({user, namespace})
  const predicate = item => _.get(item, 'spec.infrastructure.secret') === name
  const secretReferencedByShoot = _.find(shootList, predicate)
  if (secretReferencedByShoot) {
    throw new PreconditionFailed(`Only secrets not referened by any shoot can be deleted`)
  }
  await Core(user).namespaces(namespace).secrets(name).delete()
  return {metadata: {name, namespace}}
}
