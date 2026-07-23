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

function expectedChipRgbChannels (background) {
  const accessible = pickAccessibleChipColors(background)
  return {
    backgroundRgb: colorToVuetifyRgb(accessible.background),
    textRgb: colorToVuetifyRgb(accessible.textColor),
  }
}

describe('composables', () => {
  describe('useAccessibleChipColor', () => {
    describe('#pickAccessibleChipColors', () => {
      it('should keep a dark background and use white text when contrast already passes', () => {
        const background = '#B71C1C'
        const result = pickAccessibleChipColors(background)
        expect(result.background).toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should darken a mid-tone background to keep white text', () => {
        const background = '#E57373'
        expect(wcagContrast(background, '#ffffff')).toBeLessThan(4.5)

        const result = pickAccessibleChipColors(background)
        expect(result.background).not.toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should darken a light pastel to keep white text', () => {
        const background = '#FFCDD2'
        const result = pickAccessibleChipColors(background)
        expect(result.background).not.toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should fail open for invalid colors', () => {
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

      it('should expose accessible RGB channels as root CSS variables', () => {
        const theme = createTheme({
          error: '#E57373',
        })
        const { errorChipCssVars } = useAccessibleErrorChipColors(theme)

        expect(errorChipCssVars.value).toEqual(expectedChipRgbChannels('#E57373'))
        expect(errorChipCssVars.value.backgroundRgb).not.toBe(colorToVuetifyRgb('#E57373'))
        expect(errorChipCssVars.value.textRgb).toBe(colorToVuetifyRgb('#ffffff'))
      })

      it('should return undefined when the theme has no error color', () => {
        const { errorChipCssVars } = useAccessibleErrorChipColors(createTheme({}))
        expect(errorChipCssVars.value).toBeUndefined()
      })

      it('should recompute when the theme error color changes', () => {
        const theme = createTheme({
          error: '#E57373',
        })
        const { errorChipCssVars } = useAccessibleErrorChipColors(theme)
        const initialBackgroundRgb = errorChipCssVars.value.backgroundRgb

        theme.current.value.colors.error = '#B71C1C'

        expect(errorChipCssVars.value).toEqual(expectedChipRgbChannels('#B71C1C'))
        expect(errorChipCssVars.value.backgroundRgb).not.toBe(initialBackgroundRgb)
      })

      it('should not share css vars across different explicit themes', () => {
        const first = useAccessibleErrorChipColors(createTheme({ error: '#E57373' }))
        const second = useAccessibleErrorChipColors(createTheme({ error: '#B71C1C' }))

        expect(first.errorChipCssVars).not.toBe(second.errorChipCssVars)
        expect(first.errorChipCssVars.value.backgroundRgb)
          .not.toBe(second.errorChipCssVars.value.backgroundRgb)
      })

      it('should reuse one shared css vars object on the default theme path', () => {
        const first = useAccessibleErrorChipColors()
        const second = useAccessibleErrorChipColors()

        expect(first.errorChipCssVars).toBe(second.errorChipCssVars)
      })

      it('should sync css variables onto the document element', () => {
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
