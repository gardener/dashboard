//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default function () {
  return store => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', e => {
      const value = store.getters['storage/colorScheme']
      if (!['dark', 'light'].includes(value)) {
        store.commit('SET_DARK_THEME', e.matches)
      }
    })

    store.subscribeAction(action => {
      if (action.type === 'storage/setColorScheme') {
        let value = mq.matches
        switch (action.payload) {
          case 'dark':
            value = true
            break
          case 'light':
            value = false
            break
        }
        store.commit('SET_DARK_THEME', value)
      }
    })
  }
}
