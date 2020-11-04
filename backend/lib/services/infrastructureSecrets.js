//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const _ = require('lodash')
const logger = require('../logger')
const { Resources } = require('@gardener-dashboard/kube-client')
const { UnprocessableEntity, PreconditionFailed, MethodNotAllowed } = require('http-errors')
const { format: fmt } = require('util')
const { decodeBase64, encodeBase64 } = require('../utils')
const whitelistedPropertyKeys = ['accessKeyID', 'subscriptionID', 'project', 'domainName', 'tenantName', 'authUrl', 'vsphereUsername', 'nsxtUsername']
const cloudprofiles = require('./cloudprofiles')
const shoots = require('./shoots')
const { getQuotas, findProjectByNamespace } = require('../cache')

function fromResource ({ secretBinding, cloudProviderKind, secret, quotas = [], projectName, hasCostObject }) {
  const cloudProfileName = secretBinding.metadata.labels['cloudprofile.garden.sapcloud.io/name']

  const infrastructureSecret = {
    metadata: {
      secretName: _.get(secretBinding, 'secretRef.name'),
      secretNamespace: _.get(secretBinding, 'secretRef.namespace'),
      cloudProviderKind,
      cloudProfileName,
      bindingNamespace: _.get(secretBinding, 'metadata.namespace'),
      bindingName: _.get(secretBinding, 'metadata.name'),
      projectName,
      hasCostObject
    },
    quotas
  }

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

function toSecretResource ({ metadata, data }) {
  const resource = Resources.Secret
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const type = 'Opaque'
  metadata = _
    .chain(metadata)
    .pick(['namespace', 'name'])
    .value()
  try {
    data = _.mapValues(data, encodeBase64)
  } catch (err) {
    throw new UnprocessableEntity('Failed to encode "base64" secret data')
  }
  return { apiVersion, kind, metadata, type, data }
}

function toSecretBindingResource ({ metadata }) {
  const resource = Resources.SecretBinding
  const apiVersion = resource.apiVersion
  const kind = resource.kind
  const name = metadata.bindingName
  const secretRef = {
    name: metadata.name,
    namespace: metadata.namespace
  }
  const labels = {
    'cloudprofile.garden.sapcloud.io/name': metadata.cloudProfileName
  }

  metadata = _
    .chain(metadata)
    .pick(['namespace'])
    .assign({ name, labels })
    .value()
  return { apiVersion, kind, metadata, secretRef }
}

function resolveQuotas (secretBinding) {
  const quotas = getQuotas()
  const findQuota = ({ namespace, name } = {}) => _.find(quotas, ({ metadata }) => metadata.namespace === namespace && metadata.name === name)
  try {
    return _
      .chain(secretBinding.quotas)
      .map(findQuota)
      .compact()
      .value()
  } catch (err) {
    return []
  }
}

async function getInfrastructureSecrets ({ secretBindings, cloudProfileList, secretList, namespace }) {
  return _
    .chain(secretBindings)
    .map(secretBinding => {
      try {
        const cloudProfileName = _.get(secretBinding, ['metadata', 'labels', 'cloudprofile.garden.sapcloud.io/name'])
        const cloudProfile = _.find(cloudProfileList, ['metadata.name', cloudProfileName])
        const cloudProviderKind = _.get(cloudProfile, 'metadata.cloudProviderKind')
        const secretName = _.get(secretBinding, 'secretRef.name')
        const secretNamespace = _.get(secretBinding, 'secretRef.namespace', namespace)
        const projectInfo = getProjectNameAndHasCostObject(secretNamespace)
        if (!cloudProviderKind) {
          throw new Error(fmt('Could not determine cloud provider kind for cloud profile name %s. Skipping infrastructure secret with name %s', cloudProfileName, secretName))
        }
        const secret = _.find(secretList, ['metadata.name', secretName]) // pragma: whitelist secret
        if (secretBinding.metadata.namespace === secretBinding.secretRef.namespace && !secret) {
          throw new Error(fmt('Secret missing for secretbinding in own namespace. Skipping infrastructure secret with name %s', secretName))
        }
        return fromResource({
          secretBinding,
          cloudProviderKind,
          secret,
          quotas: resolveQuotas(secretBinding),
          ...projectInfo
        })
      } catch (err) {
        logger.warn(err.message)
      }
    })
    .compact()
    .value()
}

async function getCloudProviderKind (user, name) {
  const cloudProfile = await cloudprofiles.read({ user, name })
  return _.get(cloudProfile, 'metadata.cloudProviderKind')
}

/*
  The referenced secret can be from a different project to which the user has no access.
  Below we read the project from the cache without any authorization check.
  Only the name of project and the info if the project has a cost object is passed to the user.
  Since this is not sensitive information no authorization check is required.
*/
function getProjectNameAndHasCostObject (namespace) {
  const project = findProjectByNamespace(namespace)
  const projectName = _.get(project, 'metadata.name')
  const costObject = _.get(project, 'metadata.annotations["billing.gardener.cloud/costObject"]')
  const hasCostObject = !_.isEmpty(costObject)
  return { projectName, hasCostObject }
}

exports.list = async function ({ user, namespace }) {
  const client = user.client

  try {
    const cloudProfileList = await cloudprofiles.list({ user })
    const [
      { items: secretList },
      { items: secretBindings }
    ] = await Promise.all([
      client.core.secrets.list(namespace),
      client['core.gardener.cloud'].secretbindings.list(namespace)
    ])

    return getInfrastructureSecrets({
      secretBindings,
      cloudProfileList,
      secretList,
      namespace
    })
  } catch (err) {
    logger.error(err)
    throw err
  }
}

exports.create = async function ({ user, namespace, body }) {
  const client = user.client

  const secret = await client.core.secrets.create(namespace, toSecretResource(body))

  const secretBinding = await client['core.gardener.cloud'].secretbindings.create(namespace, toSecretBindingResource(body))

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(user, cloudProfileName)
  const projectInfo = getProjectNameAndHasCostObject(namespace)

  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding),
    ...projectInfo
  })
}

function checkIfOwnSecret (bodySecretBinding) {
  const secretNamespace = _.get(bodySecretBinding, 'secretRef.namespace')
  const secretBindingNamespace = _.get(bodySecretBinding, 'metadata.namespace')

  if (secretNamespace !== secretBindingNamespace) {
    throw new MethodNotAllowed('Patch allowed only for secrets in own namespace')
  }
}

exports.patch = async function ({ user, namespace, bindingName, body }) {
  const client = user.client

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(namespace, bindingName)
  const secretName = _.get(secretBinding, 'secretRef.name')

  checkIfOwnSecret(secretBinding)

  const secret = await client.core.secrets.mergePatch(namespace, secretName, toSecretResource(body))

  const cloudProfileName = _.get(body, 'metadata.cloudProfileName')
  const cloudProviderKind = await getCloudProviderKind(user, cloudProfileName)
  const projectInfo = getProjectNameAndHasCostObject(namespace)

  return fromResource({
    secretBinding,
    secret,
    cloudProviderKind,
    quotas: resolveQuotas(secretBinding),
    ...projectInfo
  })
}

exports.remove = async function ({ user, namespace, bindingName }) {
  const client = user.client

  const secretBinding = await client['core.gardener.cloud'].secretbindings.get(namespace, bindingName)
  const secretName = _.get(secretBinding, 'secretRef.name')

  checkIfOwnSecret(secretBinding)

  const { items: shootList } = await shoots.list({ user, namespace })
  const predicate = (item) => {
    const itemSecretBindingName = _.get(item, 'spec.secretBindingName')
    return itemSecretBindingName === bindingName
  }
  const secretReferencedByShoot = _.find(shootList, predicate)
  if (secretReferencedByShoot) {
    throw new PreconditionFailed('Only secrets not referened by any shoot can be deleted')
  }

  await Promise.all([
    await client['core.gardener.cloud'].secretbindings.delete(namespace, bindingName),
    await client.core.secrets.delete(namespace, secretName)
  ])
  return { metadata: { name: secretName, bindingName, namespace } }
}
