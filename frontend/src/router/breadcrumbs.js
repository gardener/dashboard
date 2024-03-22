//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  get,
  pick,
} from '@/lodash'

function projectItem (params, projectName, to = false) {
  const item = {
    get title () {
      return projectName ?? 'All Projects'
    },
    isProjectItem: true,
  }
  if (!to) {
    return item
  }
  return {
    ...item,
    get to () {
      return {
        name: 'ShootList',
        params: pick(params, ['namespace']),
      }
    },
  }
}

export function homeBreadcrumbs () {
  return [
    {
      title: 'Home',
    },
  ]
}

export function newProjectBreadcrumbs () {
  return [
    {
      title: 'Create Project',
    },
  ]
}

export function accountBreadcrumbs () {
  return [
    {
      title: 'Account',
    },
  ]
}

export function settingsBreadcrumbs () {
  return [
    {
      title: 'Settings',
    },
  ]
}

export function membersBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Members',
    },
    projectItem(params, projectName),
  ]
}

export function administrationBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Administration',
    },
    projectItem(params, projectName),
  ]
}

export function newShootBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Create Cluster',
    },
    projectItem(params, projectName),
  ]
}

export function newShootEditorBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Create Cluster Editor',
    },
    projectItem(params, projectName),
  ]
}

export function terminalBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Garden Cluster Terminal',
    },
    projectItem(params, projectName),
  ]
}

export function shootListBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: { namespace: '_all' },
        }
      },
    },
    projectItem(params, projectName),
  ]
}

export function secretsBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Secrets',
    },
    projectItem(params, projectName),
  ]
}

export function notFoundBreadcrumbs () {
  return [
    {
      title: 'Oops …',
    },
  ]
}

export function shootItemBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: { namespace: '_all' },
        }
      },
    },
    projectItem(params, projectName, true),
    {
      get title () {
        return get(params, 'name')
      },
      isNameItem: true,
    },
  ]
}

export function secretItemBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Secrets',
      get to () {
        return {
          name: 'Secrets',
          params: pick(params, ['namespace']),
        }
      },
    },
    projectItem(params, projectName, true),
    {
      get title () {
        return get(params, 'name')
      },
      isNameItem: true,
    },
  ]
}

export function shootItemTerminalBreadcrumbs ({ params }, projectName) {
  return [
    {
      title: 'Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: { namespace: '_all' },
        }
      },
    },
    projectItem(params, projectName, true),
    {
      get title () {
        return get(params, 'name')
      },
      get to () {
        return {
          name: 'ShootItem',
          params,
        }
      },
      isNameItem: true,
    },
    {
      title: 'Terminal',
    },
  ]
}
