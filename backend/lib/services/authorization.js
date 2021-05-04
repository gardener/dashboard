//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Resources } = require('@gardener-dashboard/kube-client')

async function hasAuthorization (user, { resourceAttributes, nonResourceAttributes }) {
  if (!user) {
    return false
  }
  const client = user.client
  const { apiVersion, kind } = Resources.SelfSubjectAccessReview
  const body = {
    kind,
    apiVersion,
    spec: {
      resourceAttributes,
      nonResourceAttributes
    }
  }
  const {
    status: {
      allowed = false
    } = {}
  } = await client['authorization.k8s.io'].selfsubjectaccessreviews.create(body)
  return allowed
}

exports.isAdmin = function (user) {
  // if someone is allowed to get secrets in all namespaces he is considered to be an administrator
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: '',
      resource: 'secrets'
    }
  })
}

exports.canGetOpenAPI = function (user) {
  return hasAuthorization(user, {
    nonResourceAttributes: {
      verb: 'get',
      path: '/openapi/v2'
    }
  })
}

exports.canGetShoot = function (user, namespace, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace,
      name
    }
  })
}

exports.canListSeeds = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'seeds'
    }
  })
}

exports.canListCloudProfiles = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles'
    }
  })
}

exports.canGetCloudProfiles = function (user, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
      name
    }
  })
}

exports.canListControllerRegistrations = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'controllerregistrations'
    }
  })
}

/*
SelfSubjectRulesReview should only be used to hide/show actions or views on the UI and not for authorization checks.
*/
exports.selfSubjectRulesReview = async function (user, namespace) {
  if (!user) {
    return false
  }
  const client = user.client
  const { apiVersion, kind } = Resources.SelfSubjectRulesReview
  const body = {
    kind,
    apiVersion,
    spec: {
      namespace
    }
  }
  const {
    status: {
      resourceRules,
      nonResourceRules,
      incomplete,
      evaluationError
    } = {}
  } = await client['authorization.k8s.io'].selfsubjectrulesreviews.create(body)
  return { resourceRules, nonResourceRules, incomplete, evaluationError }
}
