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
  colorToVuetifyRgb,
  useAccessibleChipColors,
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
        expect(result.backgroundChanged).toBe(false)
        expect(result.textColorChanged).toBe(false)
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should darken the background when needed so white text stays readable', () => {
        const background = '#E57373'
        expect(wcagContrast(background, '#ffffff')).toBeLessThan(4.5)

        const result = pickAccessibleChipColors(background)
        expect(result.background).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.background).not.toBe(background)
        expect(result.textColor).toBe('#ffffff')
        expect(result.backgroundChanged).toBe(true)
        expect(result.textColorChanged).toBe(false)
        expect(wcagContrast(result.background, result.textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should reach the highest possible contrast by darkening the background', () => {
        const result = pickAccessibleChipColors('#ffffff', {
          targetContrast: 21,
        })

        expect(result.background).toBe('#000000')
        expect(result.textColor).toBe('#ffffff')
        expect(wcagContrast(result.background, result.textColor)).toBe(21)
      })

      it('should fall back to white text when the background color cannot be parsed', () => {
        expect(pickAccessibleChipColors('not-a-color')).toEqual({
          background: 'not-a-color',
          textColor: '#ffffff',
          backgroundChanged: false,
          textColorChanged: false,
        })
      })
    })

    describe('#pickAccessibleChipColors with a tonal chip', () => {
      it('should keep the default tonal colors when their contrast already passes', () => {
        const color = '#BF360C'
        const surface = '#ffffff'
        const blend = blendOver(color, surface, 0.12)
        expect(wcagContrast(color, blend)).toBeGreaterThanOrEqual(4.5)

        expect(pickAccessibleChipColors(color, {
          variant: 'tonal',
          surface,
        })).toEqual({
          background: blend,
          textColor: color,
          backgroundChanged: false,
          textColorChanged: false,
        })
      })

      it('should adjust only the background when that is enough for contrast', () => {
        const color = '#2e7b19'
        const surface = '#ffffff'
        const blend = blendOver(color, surface, 0.12)
        expect(wcagContrast(color, blend)).toBeLessThan(4.5)
        expect(wcagContrast(color, surface)).toBeGreaterThanOrEqual(4.5)

        const result = pickAccessibleChipColors(color, {
          variant: 'tonal',
          surface,
        })
        expect(result.textColor).toBe(color)
        expect(result.background).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.background).not.toBe(color)
        expect(result.backgroundChanged).toBe(true)
        expect(result.textColorChanged).toBe(false)
        expect(wcagContrast(result.textColor, result.background)).toBeGreaterThanOrEqual(4.5)
      })

      it('should adjust only the text when background search cannot meet contrast', () => {
        const color = '#E65100'
        const surface = '#ffffff'
        expect(wcagContrast(color, surface)).toBeLessThan(4.5)

        const result = pickAccessibleChipColors(color, {
          variant: 'tonal',
          surface,
        })
        expect(result.textColor).toMatch(/^#[0-9a-f]{6}$/)
        expect(result.textColor).not.toBe(color)
        expect(result.textColor).not.toBe('#000000')
        expect(result.textColor).not.toBe('#ffffff')
        expect(result.backgroundChanged).toBe(false)
        expect(result.textColorChanged).toBe(true)

        const blend = blendOver(color, surface, 0.12)
        expect(result.background).toBe(blend)
        expect(wcagContrast(result.textColor, blend)).toBeGreaterThanOrEqual(4.5)
      })

      it('should return undefined when tonal colors cannot be parsed', () => {
        expect(pickAccessibleChipColors('not-a-color', {
          variant: 'tonal',
          surface: '#ffffff',
        })).toBeUndefined()
      })
    })

    describe('#useAccessibleChipColors', () => {
      function setTheme (colors, dark = false) {
        mockThemeCurrent.value = {
          dark,
          colors: {
            ...colors,
          },
        }
      }

      beforeEach(() => {
        mockThemeCurrent.value = {
          dark: false,
          colors: {
            error: '#E57373',
            warning: '#E65100',
          },
        }
      })

      it('should darken a low-contrast theme error color and use white text', () => {
        setTheme({
          error: '#E57373',
        })
        const { chipCssVars } = useAccessibleChipColors()

        expect(chipCssVars.value.error.backgroundRgb).not.toBe(colorToVuetifyRgb('#E57373'))
        expect(chipCssVars.value.error.textRgb).toBe(colorToVuetifyRgb('#ffffff'))
      })

      it('should return undefined when the theme has no error color', () => {
        setTheme({})
        const { chipCssVars } = useAccessibleChipColors()
        expect(chipCssVars.value.error).toBeUndefined()
      })

      it('should update the chip colors when the theme\'s error color changes', () => {
        setTheme({
          error: '#E57373',
        })
        const { chipCssVars } = useAccessibleChipColors()
        const initialBackgroundRgb = chipCssVars.value.error.backgroundRgb

        mockThemeCurrent.value.colors.error = '#B71C1C'

        expect(chipCssVars.value.error.backgroundRgb).not.toBe(initialBackgroundRgb)
        expect(chipCssVars.value.error).toEqual({
          backgroundRgb: colorToVuetifyRgb('#B71C1C'),
          textRgb: colorToVuetifyRgb('#ffffff'),
        })
      })

      it('should set only the text CSS variable for a low-contrast light warning', () => {
        setTheme({
          warning: '#E65100',
        })
        const { chipCssVars } = useAccessibleChipColors()

        expect(chipCssVars.value.warning.textRgb).toBeDefined()
        expect(chipCssVars.value.warning).not.toHaveProperty('backgroundRgb')
      })

      it('should set only the background CSS variables when background adjustment is enough', () => {
        setTheme({
          warning: '#2e7b19',
        })
        const { chipCssVars } = useAccessibleChipColors()

        expect(chipCssVars.value.warning.backgroundRgb).toBeDefined()
        expect(chipCssVars.value.warning.backgroundOpacity).toBe('1')
        expect(chipCssVars.value.warning).not.toHaveProperty('textRgb')
      })

      it('should not override tonal colors when their contrast already passes', () => {
        setTheme({
          warning: '#BF360C',
        })
        const { chipCssVars } = useAccessibleChipColors()

        expect(chipCssVars.value.warning).toEqual({})
      })

      it('should set document-level CSS variables for both chip variants', () => {
        const { chipCssVars } = useAccessibleChipColors()

        expect(document.documentElement.style.getPropertyValue(ERROR_CHIP_BACKGROUND_VAR))
          .toBe(chipCssVars.value.error.backgroundRgb)
        expect(document.documentElement.style.getPropertyValue(ERROR_CHIP_TEXT_VAR))
          .toBe(chipCssVars.value.error.textRgb)
        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_TEXT_VAR))
          .toBe(chipCssVars.value.warning.textRgb)
        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_BACKGROUND_VAR))
          .toBe('')
        expect(document.documentElement.style.getPropertyValue(WARNING_CHIP_BACKGROUND_OPACITY_VAR))
          .toBe('')
      })
    })
  })
})
