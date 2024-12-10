//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Resources, createClient } = require('@gardener-dashboard/kube-client')
const openfga = require('../openfga')
const logger = require('../logger')

async function hasAuthorization (user, { resourceAttributes, nonResourceAttributes }) {
  if (!user) {
    return false
  }
  const client = user.client ?? createClient(user)
  const { apiVersion, kind } = Resources.SelfSubjectAccessReview
  const body = {
    kind,
    apiVersion,
    spec: {
      resourceAttributes,
      nonResourceAttributes,
    },
  }
  const {
    status: {
      allowed = false,
    } = {},
  } = await client['authorization.k8s.io'].selfsubjectaccessreviews.create(body)
  return allowed
}

exports.isAdmin = function (user) {
  // if someone is allowed to get secrets in all namespaces he is considered to be an administrator
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: '',
      resource: 'secrets',
    },
  })
}

exports.canListProjects = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'projects',
    },
  })
}

exports.canGetOpenAPI = function (user) {
  return hasAuthorization(user, {
    nonResourceAttributes: {
      verb: 'get',
      path: '/openapi/v3',
    },
  })
}

exports.canListShoots = function (user, namespace) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace,
    },
  })
}

exports.canGetShoot = function (user, namespace, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace,
      name,
    },
  })
}

exports.canListSeeds = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'seeds',
    },
  })
}

exports.canListCloudProfiles = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
    },
  })
}

exports.canGetCloudProfiles = function (user, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
      name,
    },
  })
}

exports.canListResourceQuotas = function (user, namespace) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: '',
      resource: 'resourcequotas',
      namespace,
    },
  })
}

exports.canListControllerRegistrations = function (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'controllerregistrations',
    },
  })
}

exports.canGetSecret = function (user, namespace, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: '',
      resource: 'secrets',
      namespace,
      name,
    },
  })
}

/*
SelfSubjectRulesReview should only be used to hide/show actions or views on the UI and not for authorization checks.
*/
exports.selfSubjectRulesReview = async function (user, namespace, accountId) {
  if (!user) {
    return false
  }
  const client = user.client
  const { apiVersion, kind } = Resources.SelfSubjectRulesReview
  const body = {
    kind,
    apiVersion,
    spec: {
      namespace,
    },
  }

  const [
    {
      status: {
        resourceRules: k8sResourceRules = [],
        nonResourceRules: k8sNonResourceRules = [],
        incomplete: k8sIncomplete = false,
        evaluationError: k8sEvaluationError = null,
      } = {},
    },
    {
      resourceRules: fgaResourceRules = [],
      nonResourceRules: fgaNonResourceRules = [],
      incomplete: fgaIncomplete = false,
      evaluationError: fgaEvaluationError = null,
    } = {},
  ] = await Promise.all([
    client['authorization.k8s.io'].selfsubjectrulesreviews.create(body),
    fgaSelfSubjectRulesReview(user, namespace, accountId),
  ])

  const resourceRules = [...k8sResourceRules, ...fgaResourceRules]
  const nonResourceRules = [...k8sNonResourceRules, ...fgaNonResourceRules]
  const incomplete = k8sIncomplete || fgaIncomplete
  const evaluationError = [k8sEvaluationError, fgaEvaluationError].filter(Boolean).join(' | ') || undefined

  return { resourceRules, nonResourceRules, incomplete, evaluationError }
}

async function fgaSelfSubjectRulesReview (user, namespace, accountId) {
  if (!openfga.client || !accountId) {
    return
  }
  const username = user.id
  try {
    const resourceRules = await openfga.getDerivedResourceRules(username, namespace, accountId)
    return {
      resourceRules,
    }
  } catch (error) {
    logger.debug('Error while fetching FGA derived resource rules: %s', error.message)
    return {
      incomplete: true,
      evaluationError: error.message,
    }
  }
}
