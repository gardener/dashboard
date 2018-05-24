//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

exports.list = async function ({user, namespace, shootsWithIssuesOnly = false}) {
  let qs
  if (shootsWithIssuesOnly) {
    qs = {labelSelector: 'shoot.garden.sapcloud.io/unhealthy=true'}
  }
  return Garden(user).namespaces(namespace).shoots.get({qs})
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

const patch = exports.patch = async function ({user, namespace, name, body}) {
  return Garden(user).namespaces(namespace).shoots.mergePatch({name, body})
}

exports.replaceSpec = async function ({user, namespace, name, body}) {
  const spec = body.spec || body
  const patchOperations = [
    {
      op: 'replace',
      path: '/spec',
      value: spec
    }
  ]
  return Garden(user).namespaces(namespace).shoots.jsonPatch({name, body: patchOperations})
}

exports.replaceVersion = async function ({user, namespace, name, body}) {
  const version = body.version
  const patchOperations = [
    {
      op: 'replace',
      path: '/spec/kubernetes/version',
      value: version
    }
  ]
  return Garden(user).namespaces(namespace).shoots.jsonPatch({name, body: patchOperations})
}

exports.patchAnnotation = async function ({user, namespace, name, annotations}) {
  const body = {
    metadata: {
      annotations: annotations
    }
  }
  return patch({user, namespace, name, body})
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
  const readKubeConfig = new Promise(async (resolve, reject) => {
    try {
      resolve(await Core(user).ns(namespace).secrets.get({name: `${name}.kubeconfig`}))
    } catch (err) {
      if (err.code === 404) {
        resolve(undefined)
      } else {
        reject(err)
      }
    }
  })
  const [
    shoot,
    secret
  ] = await Promise.all([
    this.read({user, namespace, name}),
    readKubeConfig
  ])

  const seed = _.find(getSeeds(), ['metadata.name', shoot.spec.cloud.seed])

  const ingressDomain = _.get(seed, 'spec.ingressDomain')
  const projectName = namespace.replace(/^garden-/, '')
  const shootIngressDomain = `${name}.${projectName}.${ingressDomain}`

  if (secret) {
    const data = _
      .chain(secret)
      .get('data')
      .pick('kubeconfig', 'username', 'password')
      .map((value, key) => [key, decodeBase64(value)])
      .fromPairs()
      .value()
    data.serverUrl = kubernetes.fromKubeconfig(data.kubeconfig).url
    data.shootIngressDomain = shootIngressDomain
    return data
  } else {
    const data = { shootIngressDomain }
    return data
  }
}
