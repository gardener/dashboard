//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  converter,
  formatHex,
  toGamut,
  wcagContrast,
} from 'culori'

const mockThemeCurrent = ref({
  colors: {
    error: '#E57373',
    warning: '#E65100',
  },
  dark: false,
})

vi.mock('vuetify', () => ({
  useTheme: () => ({
    current: mockThemeCurrent,
  }),
}))

const {
  pickAccessibleChipColors,
  pickAccessibleTonalChipColors,
  colorToVuetifyRgb,
  useAccessibleErrorChipColors,
  useAccessibleWarningChipColors,
  resetErrorChipColorCache,
  ERROR_CHIP_BACKGROUND_VAR,
  ERROR_CHIP_TEXT_VAR,
  WARNING_CHIP_TEXT_VAR,
  WARNING_CHIP_BACKGROUND_VAR,
  WARNING_CHIP_BACKGROUND_OPACITY_VAR,
} = await import('@/composables/useAccessibleChipColor')

const toOklch = converter('oklch')
const toSrgbGamut = toGamut('rgb', 'oklch')

function blendOver (foreground, background, opacity) {
  const fg = toSrgbGamut(toOklch(foreground))
  const bg = toSrgbGamut(toOklch(background))
  return formatHex({
    mode: 'rgb',
    r: fg.r * opacity + bg.r * (1 - opacity),
    g: fg.g * opacity + bg.g * (1 - opacity),
    b: fg.b * opacity + bg.b * (1 - opacity),
  })
}

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

    describe('#pickAccessibleTonalChipColors', () => {
      it('should change nothing when default tonal contrast already passes', () => {
        const color = '#BF360C'
        const surface = '#ffffff'
        const blend = blendOver(color, surface, 0.12)
        expect(wcagContrast(color, blend)).toBeGreaterThanOrEqual(4.5)

        expect(pickAccessibleTonalChipColors(color, surface)).toEqual({ mode: 'none' })
      })

      it('should adjust only the background when that is enough for contrast', () => {
        const color = '#2e7b19'
        const surface = '#ffffff'
        const blend = blendOver(color, surface, 0.12)
        expect(wcagContrast(color, blend)).toBeLessThan(4.5)
        expect(wcagContrast(color, surface)).toBeGreaterThanOrEqual(4.5)

        const result = pickAccessibleTonalChipColors(color, surface)
        expect(result.mode).toBe('background')
        expect(result.textColor).toBe(color)
        expect(result.background).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.background).not.toBe(color)
        expect(wcagContrast(result.textColor, result.background)).toBeGreaterThanOrEqual(4.5)
      })

      it('should adjust only the text when background search cannot meet contrast', () => {
        const color = '#E65100'
        const surface = '#ffffff'
        expect(wcagContrast(color, surface)).toBeLessThan(4.5)

        const result = pickAccessibleTonalChipColors(color, surface)
        expect(result.mode).toBe('text')
        expect(result.textColor).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.textColor).not.toBe(color)
        expect(result.textColor).not.toBe('#000000')
        expect(result.textColor).not.toBe('#ffffff')
        expect(result).not.toHaveProperty('background')

        const blend = blendOver(color, surface, 0.12)
        expect(wcagContrast(result.textColor, blend)).toBeGreaterThanOrEqual(4.5)
      })

      it('should leave unparseable colors unchanged', () => {
        expect(pickAccessibleTonalChipColors('not-a-color', '#ffffff')).toEqual({ mode: 'none' })
      })
    })

    describe('#useAccessibleErrorChipColors', () => {
      function createTheme (colors, dark = false) {
        return {
          current: ref({
            dark,
            colors: {
              ...colors,
            },
          }),
        }
      }

      beforeEach(() => {
        resetErrorChipColorCache()
        mockThemeCurrent.value = {
          dark: false,
          colors: {
            error: '#E57373',
            warning: '#E65100',
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

    describe('#useAccessibleWarningChipColors', () => {
      function createTheme (colors, dark = false) {
        return {
          current: ref({
            dark,
            colors: {
              ...colors,
            },
          }),
        }
      }

      beforeEach(() => {
        resetErrorChipColorCache()
        mockThemeCurrent.value = {
          dark: false,
          colors: {
            error: '#E57373',
            warning: '#E65100',
          },
        }
      })

      it('should set only the text CSS variable for a low-contrast light warning', () => {
        const { warningChipCssVars } = useAccessibleWarningChipColors(createTheme({
          warning: '#E65100',
        }))

        expect(warningChipCssVars.value.mode).toBe('text')
        expect(warningChipCssVars.value.textRgb).toBeDefined()
        expect(warningChipCssVars.value).not.toHaveProperty('backgroundRgb')
      })

      it('should set only the background CSS variables when background adjustment is enough', () => {
        const { warningChipCssVars } = useAccessibleWarningChipColors(createTheme({
          warning: '#2e7b19',
        }))

        expect(warningChipCssVars.value.mode).toBe('background')
        expect(warningChipCssVars.value.backgroundRgb).toBeDefined()
        expect(warningChipCssVars.value.backgroundOpacity).toBe('1')
        expect(warningChipCssVars.value).not.toHaveProperty('textRgb')
      })

      it('should report mode none when tonal contrast already passes', () => {
        const { warningChipCssVars } = useAccessibleWarningChipColors(createTheme({
          warning: '#BF360C',
        }))

        expect(warningChipCssVars.value).toEqual({ mode: 'none' })
      })

      it('should set document-level CSS variables for the text-only warning path', () => {
        const { warningChipCssVars } = useAccessibleWarningChipColors()
        expect(warningChipCssVars.value.mode).toBe('text')

        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_TEXT_VAR))
          .toBe(warningChipCssVars.value.textRgb)
        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_BACKGROUND_VAR))
          .toBe('')
        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_BACKGROUND_OPACITY_VAR))
          .toBe('')
      })
    })
  })
})
