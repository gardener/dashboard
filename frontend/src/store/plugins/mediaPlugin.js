//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default function (vuetify) {
  return store => {
    const setPrefersColorScheme = dark => {
      store.commit('SET_PREFERS_COLOR_SCHEME', dark ? 'dark' : 'light')
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setPrefersColorScheme(mq.matches)
    mq.addEventListener('change', e => setPrefersColorScheme(e.matches))

    const colorScheme = (state, getters) => getters.colorScheme
    const setDarkTheme = value => {
      vuetify.framework.theme.dark = value === 'dark'
    }
    setDarkTheme(store.getters.colorScheme)
    store.watch(colorScheme, setDarkTheme)
  }
}
