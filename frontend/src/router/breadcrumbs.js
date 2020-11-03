//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import pick from 'lodash/pick'

export function homeBreadcrumbs () {
  return [
    {
      text: 'Home'
    }
  ]
}

export function newProjectBreadcrumbs () {
  return [
    {
      text: 'Create Project'
    }
  ]
}

export function accountBreadcrumbs () {
  return [
    {
      text: 'Account'
    }
  ]
}

export function membersBreadcrumbs () {
  return [
    {
      text: 'Members'
    }
  ]
}

export function administrationBreadcrumbs () {
  return [
    {
      text: 'Administration'
    }
  ]
}

export function newShootBreadcrumbs () {
  return [
    {
      text: 'Create Cluster'
    }
  ]
}

export function newShootEditorBreadcrumbs () {
  return [
    {
      text: 'Create Cluster Editor'
    }
  ]
}

export function terminalBreadcrumbs () {
  return [
    {
      text: 'Garden Cluster Terminal'
    }
  ]
}

export function shootListBreadcrumbs () {
  return [
    {
      text: 'Project Clusters'
    }
  ]
}

export function secretsBreadcrumbs () {
  return [
    {
      text: 'Secrets'
    }
  ]
}

export function notFoundBreadcrumbs () {
  return [
    {
      text: 'Oops …'
    }
  ]
}

export function shootItemBreadcrumbs ({ params }) {
  return [
    {
      text: 'Project Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace'])
        }
      }
    },
    {
      get text () {
        return get(params, 'name')
      }
    }
  ]
}

export function secretItemBreadcrumbs ({ params }) {
  return [
    {
      text: 'Secrets',
      get to () {
        return {
          name: 'Secrets',
          params: pick(params, ['namespace'])
        }
      }
    },
    {
      get text () {
        return get(params, 'name')
      }
    }
  ]
}

export function shootItemTerminalBreadcrumbs ({ params }) {
  return [
    {
      text: 'Project Clusters',
      get to () {
        return {
          name: 'ShootList',
          params: pick(params, ['namespace'])
        }
      }
    },
    {
      get text () {
        return get(params, 'name')
      },
      get to () {
        return {
          name: 'ShootItem',
          params
        }
      }
    },
    {
      text: 'Terminal'
    }
  ]
}
