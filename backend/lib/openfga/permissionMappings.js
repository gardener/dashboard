// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

module.exports = function getPermissionMappings (accountId, projectName) {
  const accountPermissions = getAccountPermissions(accountId)
  const projectPermissions = getProjectPermissions(projectName)

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
      object: `account:${accountId}`,
    },
  ]
}

function getProjectPermissions (projectName) {
  if (!projectName) {
    return []
  }

  return [
    // Shoots
    {
      verbs: ['create'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_create',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_patch',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['delete'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots'],
      relation: 'gardener_shoot_delete',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['shoots/binding'],
      relation: 'gardener_shoot_binding_patch',
      object: `gardener_project:${projectName}`,
    },
    // Terminals
    {
      verbs: ['create'],
      apiGroups: ['dashboard.gardener.cloud'],
      resources: ['terminals'],
      relation: 'gardener_terminal_create',
      object: `gardener_project:${projectName}`,
    },
    // Secrets
    {
      verbs: ['list'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_get',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_create',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['patch'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_patch',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['delete'],
      apiGroups: [''],
      resources: ['secrets'],
      relation: 'gardener_secrets_delete',
      object: `gardener_project:${projectName}`,
    },
    // Service Accounts
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['serviceaccounts/token'],
      relation: 'gardener_token_request_create',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['create'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_create',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['patch'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_patch',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['delete'],
      apiGroups: [''],
      resources: ['serviceaccounts'],
      relation: 'gardener_service_account_delete',
      object: `gardener_project:${projectName}`,
    },
    // Projects
    {
      verbs: ['patch'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_patch',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['delete'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_delete',
      object: `gardener_project:${projectName}`,
    },
    {
      verbs: ['manage-members'],
      apiGroups: ['core.gardener.cloud'],
      resources: ['projects'],
      relation: 'gardener_project_members_manage',
      object: `gardener_project:${projectName}`,
    },
  ]
}
