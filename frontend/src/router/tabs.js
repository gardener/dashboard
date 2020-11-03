//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
          name: 'ShootItemEditor',
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
