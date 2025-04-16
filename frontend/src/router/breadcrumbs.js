//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import pick from 'lodash/pick'

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

export function membersBreadcrumbs () {
  return [
    {
      title: 'Members',
    },
  ]
}

export function administrationBreadcrumbs () {
  return [
    {
      title: 'Administration',
    },
  ]
}

export function newShootBreadcrumbs () {
  return [
    {
      title: 'Create Cluster',
    },
  ]
}

export function newShootEditorBreadcrumbs () {
  return [
    {
      title: 'Create Cluster Editor',
    },
  ]
}

export function terminalBreadcrumbs () {
  return [
    {
      title: 'Garden Cluster Terminal',
    },
  ]
}

export function shootListBreadcrumbs () {
  return [
    {
      title: 'Project Clusters',
    },
  ]
}

export function credentialsBreadcrumbs () {
  return [
    {
      title: 'Credentials',
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

export function shootItemBreadcrumbs ({ params }) {
  return [
    {
      title: 'Project Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace']),
        }
      },
    },
    {
      get title () {
        return get(params, ['name'])
      },
    },
  ]
}

export function shootItemTerminalBreadcrumbs ({ params }) {
  return [
    {
      title: 'Project Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace']),
        }
      },
    },
    {
      get title () {
        return get(params, ['name'])
      },
      get to () {
        return {
          name: 'ShootItem',
          params,
        }
      },
    },
    {
      title: 'Terminal',
    },
  ]
}
