//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { wcagContrast } from 'culori'

const mockThemeCurrent = ref({
  colors: {
    error: '#E57373',
  },
})

vi.mock('vuetify', () => ({
  useTheme: () => ({
    current: mockThemeCurrent,
  }),
}))

const {
  pickAccessibleChipColors,
  colorToVuetifyRgb,
  useAccessibleErrorChipColors,
  resetErrorChipColorCache,
  ERROR_CHIP_BACKGROUND_VAR,
  ERROR_CHIP_TEXT_VAR,
} = await import('@/composables/useAccessibleChipColor')

describe('composables', () => {
  describe('useAccessibleChipColor', () => {
    describe('#pickAccessibleChipColors', () => {
      it('should keep the background and use white text when contrast already passes', () => {
        const background = '#B71C1C'
        const result = pickAccessibleChipColors(background)
        expect(result.background).toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should darken the background when needed so white text stays readable', () => {
        const background = '#E57373'
        expect(wcagContrast(background, '#ffffff')).toBeLessThan(4.5)

        const result = pickAccessibleChipColors(background)
        expect(result.background).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.background).not.toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should fall back to white text when the background color cannot be parsed', () => {
        expect(pickAccessibleChipColors('not-a-color')).toEqual({
          background: 'not-a-color',
          textColor: '#ffffff',
        })
      })
    })

    describe('#useAccessibleErrorChipColors', () => {
      function createTheme (colors) {
        return {
          current: ref({
            colors: {
              ...colors,
            },
          }),
        }
      }

      beforeEach(() => {
        resetErrorChipColorCache()
        mockThemeCurrent.value = {
          colors: {
            error: '#E57373',
          },
        }
      })

      it('should darken a low-contrast theme error color and use white text', () => {
        const { errorChipCssVars } = useAccessibleErrorChipColors(createTheme({
          error: '#E57373',
        }))

        expect(errorChipCssVars.value.backgroundRgb).not.toBe(colorToVuetifyRgb('#E57373'))
        expect(errorChipCssVars.value.textRgb).toBe(colorToVuetifyRgb('#ffffff'))
      })

      it('should return undefined when the theme has no error color', () => {
        const { errorChipCssVars } = useAccessibleErrorChipColors(createTheme({}))
        expect(errorChipCssVars.value).toBeUndefined()
      })

      it('should update the chip colors when the theme\'s error color changes', () => {
        const theme = createTheme({
          error: '#E57373',
        })
        const { errorChipCssVars } = useAccessibleErrorChipColors(theme)
        const initialBackgroundRgb = errorChipCssVars.value.backgroundRgb

        theme.current.value.colors.error = '#B71C1C'

        expect(errorChipCssVars.value.backgroundRgb).not.toBe(initialBackgroundRgb)
        expect(errorChipCssVars.value).toEqual({
          backgroundRgb: colorToVuetifyRgb('#B71C1C'),
          textRgb: colorToVuetifyRgb('#ffffff'),
        })
      })

      it('should set document-level CSS variables for the accessible chip colors', () => {
        const { errorChipCssVars } = useAccessibleErrorChipColors()
        const { backgroundRgb, textRgb } = errorChipCssVars.value

        expect(document.documentElement.style.getPropertyValue(ERROR_CHIP_BACKGROUND_VAR))
          .toBe(backgroundRgb)
        expect(document.documentElement.style.getPropertyValue(ERROR_CHIP_TEXT_VAR))
          .toBe(textRgb)
      })
    })
  })
})
