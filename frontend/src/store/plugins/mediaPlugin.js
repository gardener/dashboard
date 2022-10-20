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
    mq.addEventListener('change', e => setPrefersColorScheme(e.matches))
    setPrefersColorScheme(mq.matches)

    const colorScheme = (state, getters) => getters.colorScheme
    const setDarkTheme = value => {
      vuetify.framework.theme.dark = value === 'dark'
    }
    store.watch(colorScheme, setDarkTheme)
  }
}
