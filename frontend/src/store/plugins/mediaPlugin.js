//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const ColorSchemeEnum = {
  DARK: 'dark',
  LIGHT: 'light',
  AUTO: 'auto'
}

export default function (window) {
  return store => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', e => {
      if (![ColorSchemeEnum.DARK, ColorSchemeEnum.LIGHT].includes(store.state.colorScheme)) {
        store.commit('SET_DARK_THEME', e.matches)
      }
    })

    store.subscribe((mutation) => {
      if (mutation.type === 'SET_COLOR_SCHEME') {
        switch (store.state.colorScheme) {
          case ColorSchemeEnum.DARK:
            store.commit('SET_DARK_THEME', true)
            break
          case ColorSchemeEnum.LIGHT:
            store.commit('SET_DARK_THEME', false)
            break
          default:
            store.commit('SET_DARK_THEME', mq.matches)
            break
        }
      }
    })
  }
}
