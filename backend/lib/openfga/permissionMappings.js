// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default function (accountId, namespace) {
  const accountPermissions = getAccountPermissions(accountId)
  const projectPermissions = getProjectPermissions(namespace)

  return [...accountPermissions, ...projectPermissions]
}

function getAccountPermissions (accountId) {
  if (!accountId) {
    return []
  }

  return [
    {
      verbs: ['create'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_create',
      // A correlation_id can be composed of any string of alphanumeric characters or dashes between 1-36 characters in length.
      // https://openfga.dev/docs/getting-started/perform-check#03-calling-batch-check-api
      correlationId: 'gardener-project-create',
      object: `account:${accountId}`,
    },
  ]
}

function getProjectPermissions (namespace) {
  if (!namespace) {
    return []
  }

  return [
    // Shoots
    {
      verbs: ['create'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_create',
      correlationId: 'gardener-shoot-create',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_patch',
      correlationId: 'gardener-shoot-patch',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['delete'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_delete',
      correlationId: 'gardener-shoot-delete',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots/binding'],
      relation: 'gardener_shoot_binding_patch',
      correlationId: 'gardener-shoot-binding-patch',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['create'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots/adminkubeconfig'],
      relation: 'gardener_shoots_adminkubeconfig_create',
      correlationId: 'gardener-shoots-adminkc-create',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['create'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots/viewerkubeconfig'],
      relation: 'gardener_shoots_viewerkubeconfig_create',
      correlationId: 'gardener-shoots-viewerkc-create',
      object: `gardener_project:${namespace}`,
    },
    // Terminals
    {
      verbs: ['create'],
      apiGroups: ['dashboard.gardener.cloud'],
      resources: ['terminals'],
      relation: 'gardener_terminal_create',
      correlationId: 'gardener-terminal-create',
      object: `gardener_project:${namespace}`,
    },
    // Secrets
    {
      verbs: ['list'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_get',
      correlationId: 'gardener-secrets-get',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_create',
      correlationId: 'gardener-secrets-create',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['patch'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_patch',
      correlationId: 'gardener-secrets-patch',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['delete'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_delete',
      correlationId: 'gardener-secrets-delete',
      object: `gardener_project:${namespace}`,
    },
    // Service Accounts
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['serviceaccounts/token'],
      relation: 'gardener_token_request_create',
      correlationId: 'gardener-token-request-create',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_create',
      correlationId: 'gardener-service-account-create',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['patch'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_patch',
      correlationId: 'gardener-service-account-patch',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['delete'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_delete',
      correlationId: 'gardener-service-account-delete',
      object: `gardener_project:${namespace}`,
    },
    // Projects
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_patch',
      correlationId: 'gardener-project-patch',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['delete'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_delete',
      correlationId: 'gardener-project-delete',
      object: `gardener_project:${namespace}`,
    },
    {
      verbs: ['manage-members'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_members_manage',
      correlationId: 'gardener-project-members-manage',
      object: `gardener_project:${namespace}`,
    },
  ]
}
