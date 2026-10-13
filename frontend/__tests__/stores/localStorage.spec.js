//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useLocalStorageStore } from '@/store/localStorage'

function terminalRoute (name, namespace, params) {
  return {
    name,
    params,
    meta: { namespace },
  }
}

describe('stores', () => {
  describe('localStorage', () => {
    let localStorageStore

    beforeEach(() => {
      window.localStorage.clear()
      setActivePinia(createPinia())
      localStorageStore = useLocalStorageStore()
    })

    it.each([
      [
        terminalRoute('ShootItemTerminal', 'garden-core', { projectName: 'core', name: 'my-shoot' }),
        'ShootItemTerminal--garden-core--my-shoot',
      ],
      [
        terminalRoute('GardenTerminal', 'garden-core', { projectName: 'core', target: 'garden' }),
        'GardenTerminal--garden-core',
      ],
    ])('keys the terminal split-pane tree of %o by namespace', (route, key) => {
      const tree = { splitpaneTree: { id: 'root' } }
      window.localStorage.setItem(key, JSON.stringify(tree))

      expect(localStorageStore.terminalSplitpaneTreeRef(route).value).toEqual(tree)
    })

    it('separates terminal split-pane trees of same-named clusters in different Projects', () => {
      const coreRoute = terminalRoute('ShootItemTerminal', 'garden-core', { projectName: 'core', name: 'dev' })
      const teamRoute = terminalRoute('ShootItemTerminal', 'garden-team', { projectName: 'team', name: 'dev' })

      localStorageStore.terminalSplitpaneTreeRef(coreRoute).value = { splitpaneTree: { id: 'core' } }

      expect(localStorageStore.terminalSplitpaneTreeRef(teamRoute).value).toBeNull()
    })
  })
})
