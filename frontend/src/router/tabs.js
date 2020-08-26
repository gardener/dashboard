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

/**
   * Tabstrip type definition
   * @typedef {Object} Tab
   * @prop {string}   title - The tile of the tabstrip
   * @prop {function} to    - This function determines the navigation target of the router-link.
   *                          The current route object https://router.vuejs.org/api/#the-route-object is passed as parameter
   */

export function shootItemTabs ({ params }) {
  return [
    {
      key: 'shootOverview',
      title: 'Overview',
      get to () {
        return {
          name: 'ShootItem',
          params
        }
      }
    },
    {
      key: 'shootYaml',
      title: 'YAML',
      get to () {
        return {
          name: 'ShootDetailsEditor',
          params
        }
      }
    }
  ]
}

export function newShootTabs ({ params }) {
  return [
    {
      key: 'newShootOverview',
      title: 'Overview',
      get to () {
        return {
          name: 'NewShoot',
          params
        }
      }
    },
    {
      key: 'newShootYaml',
      title: 'YAML',
      get to () {
        return {
          name: 'NewShootEditor',
          params
        }
      }
    }
  ]
}
