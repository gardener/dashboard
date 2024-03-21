//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  get,
  pick,
} from '@/lodash'

function projectItem (params, projectName) {
  return {
    get title () {
      return projectName
    },
    get to () {
      return {
        name: 'Administration',
        params: pick(params, ['namespace']),
      }
    },
    isProjectItem: true,
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
    projectItem(params, projectName),
    {
      title: 'Members',
    },
  ]
}

export function administrationBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Administration',
    },
  ]
}

export function newShootBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Create Cluster',
    },
  ]
}

export function newShootEditorBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Create Cluster Editor',
    },
  ]
}

export function terminalBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Garden Cluster Terminal',
    },
  ]
}

export function shootListBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Clusters',
    },
  ]
}

export function secretsBreadcrumbs ({ params }, projectName) {
  return [
    projectItem(params, projectName),
    {
      title: 'Secrets',
    },
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
    projectItem(params, projectName),
    {
      title: 'Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace']),
        }
      },
    },
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
    projectItem(params, projectName),
    {
      title: 'Secrets',
      get to () {
        return {
          name: 'Secrets',
          params: pick(params, ['namespace']),
        }
      },
    },
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
    projectItem(params, projectName),
    {
      title: 'Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace']),
        }
      },
    },
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
