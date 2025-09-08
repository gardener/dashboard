//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import kubeClientModule from '@gardener-dashboard/kube-client'
const { Resources, createClient } = kubeClientModule

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

export function isAdmin (user) {
  // if someone is allowed to get secrets in all namespaces he is considered to be an administrator
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: '',
      resource: 'secrets',
    },
  })
}

export function canListProjects (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'projects',
    },
  })
}

export function canGetOpenAPI (user) {
  return hasAuthorization(user, {
    nonResourceAttributes: {
      verb: 'get',
      path: '/openapi/v3',
    },
  })
}

export function canListShoots (user, namespace) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'shoots',
      namespace,
    },
  })
}

export function canGetShoot (user, namespace, name) {
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

export function canListSeeds (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'seeds',
    },
  })
}

export function canListCloudProfiles (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
    },
  })
}

export function canGetCloudProfiles (user, name) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'get',
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
      name,
    },
  })
}

export function canListNamespacedCloudProfiles (user, namespace) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'namespacedcloudprofiles',
      namespace,
    },
  })
}

export function canListResourceQuotas (user, namespace) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: '',
      resource: 'resourcequotas',
      namespace,
    },
  })
}

export function canListControllerRegistrations (user) {
  return hasAuthorization(user, {
    resourceAttributes: {
      verb: 'list',
      group: 'core.gardener.cloud',
      resource: 'controllerregistrations',
    },
  })
}

export function canGetSecret (user, namespace, name) {
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
export async function selfSubjectRulesReview (user, namespace) {
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
  const {
    status: {
      resourceRules,
      nonResourceRules,
      incomplete,
      evaluationError,
    } = {},
  } = await client['authorization.k8s.io'].selfsubjectrulesreviews.create(body)
  return { resourceRules, nonResourceRules, incomplete, evaluationError }
}
