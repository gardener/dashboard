//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
