//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { wcagContrast } from 'culori/fn'

import { useCustomColors } from '@/composables/useCustomColors'

import { createTonalBackgroundColor } from '@/utils/accessibleColors'
import {
  getFlatColorName,
  getOnFlatColorName,
  getTonalColorName,
  SEMANTIC_COLOR_NAMES,
} from '@/utils/themeColors'

describe('composables', () => {
  describe('useCustomColors', () => {
    const customThemes = ref(null)
    const theme = {
      themes: {
        dark: {
          dark: true,
          colors: null,
        },
        light: {
          dark: false,
          colors: null,
        },
      },
    }

    beforeEach(() => {
      customThemes.value = null
      theme.themes.dark.colors = {
        background: '#121212',
        surface: '#212121',
        primary: '#60C0A0',
        secondary: '#424242',
        accent: '#424242',
        error: '#EF5350',
        info: '#27bbf5',
        success: '#66BB6A',
        warning: '#FFA726',
        unknown: '#BDBDBD',
      }
      theme.themes.light.colors = {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        primary: '#0a6b51',
        secondary: '#424242',
        accent: '#FFF3E0',
        error: '#D32F2F',
        info: '#0D47A1',
        success: '#388E3C',
        warning: '#E65100',
        unknown: '#424242',
      }
      for (const colors of [
        theme.themes.dark.colors,
        theme.themes.light.colors,
      ]) {
        for (const colorName of SEMANTIC_COLOR_NAMES) {
          colors[getTonalColorName(colorName)] = colors[colorName]
          colors[getFlatColorName(colorName)] = colors[colorName]
          colors[getOnFlatColorName(colorName)] = '#ffffff'
        }
      }
    })

    it('should update theme colors with a short delay', async () => {
      const lightBackground = '#EEEEEE'
      setTimeout(() => {
        customThemes.value = {
          light: {
            background: lightBackground,
          },
        }
      }, 1)
      await useCustomColors(customThemes, theme)
      expect(theme.themes.light.colors.background).toBe(lightBackground)
    })

    it('should calculate all tonal theme colors once custom colors are available', async () => {
      customThemes.value = {}

      await useCustomColors(customThemes, theme)

      for (const themeValue of Object.values(theme.themes)) {
        for (const colorName of SEMANTIC_COLOR_NAMES) {
          const tonalColorName = getTonalColorName(colorName)
          const tonalColor = themeValue.colors[tonalColorName]
          const tonalBackground = createTonalBackgroundColor(
            tonalColor,
            themeValue.colors.surface,
          )

          expect(tonalColor).toBeDefined()
          expect(wcagContrast(tonalColor, tonalBackground)).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it('should calculate flat theme colors without changing the semantic base color', async () => {
      const warning = '#E57373'
      theme.themes.light.colors.warning = warning
      customThemes.value = {}

      await useCustomColors(customThemes, theme)

      expect(theme.themes.light.colors.warning).toBe(warning)
      expect(theme.themes.light.colors.flatWarning).toBe(warning)
      expect(theme.themes.light.colors['on-flatWarning']).toBe('#000000')
      expect(
        wcagContrast(
          theme.themes.light.colors.flatWarning,
          theme.themes.light.colors['on-flatWarning'],
        ),
      ).toBeGreaterThanOrEqual(4.5)
    })

    it('should replace a user-provided tonal color that is not readable', async () => {
      const tonalWarning = '#FFFF00'
      customThemes.value = {
        light: {
          tonalWarning,
        },
      }

      await useCustomColors(customThemes, theme)

      const generatedTonalWarning = theme.themes.light.colors.tonalWarning
      const tonalBackground = createTonalBackgroundColor(
        generatedTonalWarning,
        theme.themes.light.colors.surface,
      )
      expect(generatedTonalWarning).not.toBe(tonalWarning)
      expect(wcagContrast(generatedTonalWarning, tonalBackground)).toBeGreaterThanOrEqual(4.5)
    })

    it('should keep a user-provided tonal color that stays readable on the theme surface', async () => {
      const tonalWarning = '#BF360C'
      customThemes.value = {
        light: {
          tonalWarning,
        },
      }

      await useCustomColors(customThemes, theme)

      expect(theme.themes.light.colors.tonalWarning).toBe(tonalWarning)
    })

    it('should use black text when a user-provided flat color is too light for white text', async () => {
      const flatWarning = '#E57373'
      customThemes.value = {
        light: {
          flatWarning,
        },
      }

      await useCustomColors(customThemes, theme)

      expect(theme.themes.light.colors.flatWarning).toBe(flatWarning)
      expect(theme.themes.light.colors['on-flatWarning']).toBe('#000000')
      expect(
        wcagContrast(
          theme.themes.light.colors.flatWarning,
          theme.themes.light.colors['on-flatWarning'],
        ),
      ).toBeGreaterThanOrEqual(4.5)
    })

    it('should keep a user-provided flat color and text color when they are readable together', async () => {
      const flatWarning = '#B71C1C'
      const onFlatWarning = '#ffffff'
      customThemes.value = {
        light: {
          flatWarning,
          'on-flatWarning': onFlatWarning,
        },
      }

      await useCustomColors(customThemes, theme)

      expect(theme.themes.light.colors.flatWarning).toBe(flatWarning)
      expect(theme.themes.light.colors['on-flatWarning']).toBe(onFlatWarning)
    })

    it('should calculate a tonal color from the final customized base color', async () => {
      const warning = '#FFEE00'
      customThemes.value = {
        light: {
          warning,
        },
      }

      await useCustomColors(customThemes, theme)

      const tonalWarning = theme.themes.light.colors.tonalWarning
      const tonalBackground = createTonalBackgroundColor(
        tonalWarning,
        theme.themes.light.colors.surface,
      )
      expect(theme.themes.light.colors.warning).toBe(warning)
      expect(tonalWarning).not.toBe(warning)
      expect(wcagContrast(tonalWarning, tonalBackground)).toBeGreaterThanOrEqual(4.5)
    })

    it('should fall back to the base color when tonal color calculation fails', async () => {
      theme.themes.light.colors.info = 'not-a-color'
      customThemes.value = {}

      await useCustomColors(customThemes, theme)

      expect(theme.themes.light.colors.tonalInfo).toBe('not-a-color')
      expect(theme.themes.light.colors.flatInfo).toBe('not-a-color')
    })

    it('should update theme colors immediately', async () => {
      const lightBackground = '#EEEEEE'
      customThemes.value = {
        light: {
          background: lightBackground,
        },
      }
      await useCustomColors(customThemes, theme)
      expect(theme.themes.light.colors.background).toBe(lightBackground)
    })

    describe('when updating theme colors times out', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should throw an error', async () => {
        const promise = useCustomColors(customThemes, theme)
        vi.runAllTimers()
        await expect(promise).rejects.toThrow('Setting custom colors timed out')
      })
    })
  })
})
