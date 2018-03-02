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
const logger = require('../logger')
const Resources = require('../kubernetes/Resources')
const kubernetes = require('../kubernetes')
const { UnprocessableEntity, PreconditionFailed, MethodNotAllowed } = require('../errors')
const { decodeBase64, encodeBase64 } = require('../utils')
const whitelistedPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl']
const cloudprofiles = require('./cloudprofiles')
const shoots = require('./shoots')

function Core ({auth}) {
  return kubernetes.core({auth})
}

function Garden ({auth}) {
  return kubernetes.garden({auth})
}

function fromResource ({secretBinding, bindingKind, cloudProviderKind, secret}) {
  const cloudProfileName = secretBinding.metadata.labels['cloudprofile.garden.sapcloud.io/name']

  const infrastructureSecret = {}
  infrastructureSecret.metadata = _
    .chain(secretBinding.secretRef)
    .pick(['namespace', 'name'])
    .assign({
      cloudProviderKind,
      cloudProfileName,
      bindingKind,
      bindingName: _.get(secretBinding, 'metadata.name')
    })
    .value()
  if (secret) {
    infrastructureSecret.metadata = _
      .chain(secret.metadata)
      .pick(['resourceVersion'])
      .assign(infrastructureSecret.metadata)
      .value()

    const iteratee = (value, key) => {
      value = decodeBase64(value)
      if (!_.includes(whitelistedPropertyKeys, key)) {
        value = '****************'
      }
      return value
    }
    infrastructureSecret.data = _.mapValues(secret.data, iteratee)

    const secretAccountKey = _.get(secret.data, 'serviceaccount.json')
    if (secretAccountKey) {
      infrastructureSecret.data.project = projectId(secretAccountKey)
    }
  }

  return infrastructureSecret
}

function projectId (serviceAccountKey) {
  try {
    const key = JSON.parse(decodeBase64(serviceAccountKey))
    const projectId = _.get(key, 'project_id', '')
    return projectId
  } catch (err) {
    return ''
  }
}

function toSecretResource ({metadata, data}) {
  const resource = Resources.Secret
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const type = 'Opaque'
  metadata = _
    .chain(metadata)
    .pick(['namespace', 'name', 'resourceVersion'])
    .value()
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw new UnprocessableEntity('Failed to encode "base64" secret data')
  }
  return {apiVersion, kind, metadata, type, data}
}

function toPrivateSecretBindingResource ({metadata}) {
  const resource = Resources.PrivateSecretBinding
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const name = metadata.bindingName
  const secretRef = {
    name: metadata.name
  }
  const labels = {
    'cloudprofile.garden.sapcloud.io/name': metadata.cloudProfileName
  }

  metadata = _
    .chain(metadata)
    .pick(['namespace', 'resourceVersion'])
    .assign({name, labels})
    .value()
  return {apiVersion, kind, metadata, secretRef}
}

function getInfrastructureSecrets ({secretBindings, bindingKind, cloudProfileList, secretList}) {
  let infrastructureSecrets = []

  for (const secretBinding of secretBindings) {
    const cloudProfileName = _.get(secretBinding, ['metadata', 'labels', 'cloudprofile.garden.sapcloud.io/name'])
    const cloudProviderKind = _.get(_.find(cloudProfileList, ['metadata.name', cloudProfileName]), 'metadata.cloudProviderKind')
    const secretName = secretBinding.secretRef.name
    const secret = _.find(secretList, ['metadata.name', secretName])
    if (!cloudProviderKind) {
      logger.error('Could not determine cloud provider kind for cloud profile name %s. Skipping infrastructure secret with name %s', cloudProfileName, secretName)
    } else if (bindingKind === Resources.PrivateSecretBinding.kind && !secret) {
      logger.error('Secret missing for PrivateSecretBinding. Skipping infrastructure secret with name %s', secretName)
    } else {
      infrastructureSecrets.push(fromResource({secretBinding, bindingKind, cloudProviderKind, secret}))
    }
  }
  return infrastructureSecrets
}

async function getCloudProviderKind (cloudProfileName) {
  const cloudProfile = await cloudprofiles.read({name: cloudProfileName})
  const cloudProviderKind = _.get(cloudProfile, 'metadata.cloudProviderKind')
  return cloudProviderKind
}

exports.list = async function ({user, namespace}) {
  const [
    cloudProfileList,
    {items: privateSecretBindingList},
    {items: crossSecretBindingList},
    {items: secretList}
  ] = await Promise.all([
    cloudprofiles.list(),
    Garden(user).namespaces(namespace).privatesecretbindings.get({}),
    Garden(user).namespaces(namespace).crosssecretbindings.get({}),
    Core(user).namespaces(namespace).secrets.get({})
  ])

  return _.concat(
    getInfrastructureSecrets({secretBindings: privateSecretBindingList, bindingKind: Resources.PrivateSecretBinding.kind, cloudProfileList, secretList}),
    getInfrastructureSecrets({secretBindings: crossSecretBindingList, bindingKind: Resources.CrossSecretBinding.kind, cloudProfileList, secretList: []})
  )
}

exports.create = async function ({user, namespace, body}) {
  const secret = toSecretResource(body)
  const bodySecret = await Core(user).namespaces(namespace).secrets.post({body: secret})

  const privateSecretBinding = toPrivateSecretBindingResource(body)
  const bodyPrivateSecretBinding = await Garden(user).namespaces(namespace).privatesecretbindings.post({body: privateSecretBinding})

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(cloudProfileName)

  return fromResource({secretBinding: bodyPrivateSecretBinding, bindingKind: Resources.PrivateSecretBinding.kind, secret: bodySecret, cloudProviderKind})
}

exports.patch = async function ({user, namespace, bindingName, kind, body}) {
  if (kind !== 'private') {
    throw new MethodNotAllowed('Patch allowed only for secrets of kind private')
  }

  const bodyPrivateSecretBinding = await Garden(user).namespaces(namespace).privatesecretbindings.get({name: bindingName})
  const secretName = _.get(bodyPrivateSecretBinding, 'secretRef.name')

  const secret = toSecretResource(body)
  const bodySecret = await Core(user).namespaces(namespace).secrets.mergePatch({name: secretName, body: secret})

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(cloudProfileName)

  return fromResource({secretBinding: bodyPrivateSecretBinding, bindingKind: Resources.PrivateSecretBinding.kind, secret: bodySecret, cloudProviderKind})
}

exports.remove = async function ({user, namespace, bindingName, kind}) {
  if (kind !== 'private') {
    throw new MethodNotAllowed('Patch allowed only for secrets of kind private')
  }
  const {items: shootList} = await shoots.list({user, namespace})
  const predicate = (item) => {
    const secretBindingRef = _.get(item, 'spec.cloud.secretBindingRef')
    return secretBindingRef.name === bindingName &&
      secretBindingRef.kind === Resources.PrivateSecretBinding.kind
  }
  const secretReferencedByShoot = _.find(shootList, predicate)
  if (secretReferencedByShoot) {
    throw new PreconditionFailed(`Only secrets not referened by any shoot can be deleted`)
  }

  const bodyPrivateSecretBinding = await Garden(user).namespaces(namespace).privatesecretbindings.get({name: bindingName})
  const secretName = _.get(bodyPrivateSecretBinding, 'secretRef.name')

  await Promise.all([
    await Garden(user).namespaces(namespace).privatesecretbindings.delete({name: bindingName}),
    await Core(user).namespaces(namespace).secrets.delete({name: secretName})
  ])
  return {metadata: {name: secretName, bindingName, bindingKind: Resources.PrivateSecretBinding.kind, namespace}}
}
