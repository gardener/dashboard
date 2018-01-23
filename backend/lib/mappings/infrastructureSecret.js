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

const _ = require('lodash')
const { UnprocessableEntity } = require('../errors')
const Resources = require('../kubernetes/Resources')
const { decodeBase64, encodeBase64 } = require('./common')
const whitelistedPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl']

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
exports.fromResource = fromResource

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
exports.toResource = toResource
