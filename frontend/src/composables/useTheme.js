//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { markRaw } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import { createGlobalState, useColorMode } from '@vueuse/core'

export const useTheme = createGlobalState(() => {
  const theme = useVuetifyTheme()
  const colorModes = markRaw(['auto', 'light', 'dark'])
  const colorMode = useColorMode({
    storageKey: 'global/color-scheme',
    onChanged (mode) {
      theme.global.name.value = mode === 'auto'
        ? colorMode.system.value
        : mode
    },
  })
  theme.global.name.value = colorMode.value

  return {
    colorMode: colorMode.store,
    colorModes,
  }
})
