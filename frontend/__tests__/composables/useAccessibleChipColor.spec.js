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
  useErrorChipColor,
  resetErrorChipColorCache,
} = await import('@/composables/useAccessibleChipColor')

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

    describe('#useErrorChipColor', () => {
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

      it('should override error and on-error with white text on a darkened background', () => {
        const theme = createTheme({
          error: '#E57373',
        })
        const { errorChipStyle } = useErrorChipColor(theme)
        const accessible = pickAccessibleChipColors('#E57373')

        expect(errorChipStyle.value).toEqual({
          '--v-theme-error': colorToVuetifyRgb(accessible.background),
          '--v-theme-on-error': colorToVuetifyRgb('#ffffff'),
        })
        expect(errorChipStyle.value['--v-theme-error']).not.toBe(colorToVuetifyRgb('#E57373'))
      })

      it('should return undefined when the theme has no error color', () => {
        const { errorChipStyle } = useErrorChipColor(createTheme({}))
        expect(errorChipStyle.value).toBeUndefined()
      })

      it('should recompute when the theme error color changes', () => {
        const theme = createTheme({
          error: '#E57373',
        })
        const { errorChipStyle } = useErrorChipColor(theme)
        const initial = errorChipStyle.value['--v-theme-error']

        theme.current.value.colors.error = '#B71C1C'

        expect(errorChipStyle.value['--v-theme-error']).toBe(colorToVuetifyRgb('#B71C1C'))
        expect(errorChipStyle.value['--v-theme-on-error']).toBe(colorToVuetifyRgb('#ffffff'))
        expect(errorChipStyle.value['--v-theme-error']).not.toBe(initial)
      })

      it('should not share style across different explicit themes', () => {
        const first = useErrorChipColor(createTheme({ error: '#E57373' }))
        const second = useErrorChipColor(createTheme({ error: '#B71C1C' }))

        expect(first.errorChipStyle).not.toBe(second.errorChipStyle)
        expect(first.errorChipStyle.value['--v-theme-error'])
          .not.toBe(second.errorChipStyle.value['--v-theme-error'])
      })

      it('should reuse one shared style on the default theme path', () => {
        const first = useErrorChipColor()
        const second = useErrorChipColor()

        expect(first.errorChipStyle).toBe(second.errorChipStyle)
      })
    })
  })
})
