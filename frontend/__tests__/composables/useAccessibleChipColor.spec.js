//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { wcagContrast } from 'culori'

import {
  pickAccessibleBackgroundColor,
  colorToVuetifyRgb,
  useErrorChipColor,
} from '@/composables/useAccessibleChipColor'

describe('composables', () => {
  describe('useAccessibleChipColor', () => {
    describe('#pickAccessibleBackgroundColor', () => {
      it('should return the original color when contrast already meets WCAG AA', () => {
        const background = '#B71C1C'
        expect(pickAccessibleBackgroundColor(background)).toBe(background)
      })

      it('should darken a light pastel background for white text', () => {
        const background = '#FFCDD2'
        const accessible = pickAccessibleBackgroundColor(background)
        expect(accessible).not.toBe(background)
        expect(wcagContrast(accessible, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      })

      it('should lighten a dark background for dark text', () => {
        const background = '#1B5E20'
        const textColor = '#000000'
        const accessible = pickAccessibleBackgroundColor(background, textColor)
        expect(accessible).not.toBe(background)
        expect(wcagContrast(accessible, textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should fail open for invalid colors', () => {
        expect(pickAccessibleBackgroundColor('not-a-color')).toBe('not-a-color')
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

      it('should return an accessible --v-theme-error override', () => {
        const theme = createTheme({
          error: '#FFCDD2',
          'on-error': '#ffffff',
        })
        const { errorChipStyle } = useErrorChipColor(theme)
        const rgb = errorChipStyle.value['--v-theme-error']

        expect(rgb).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/)
        expect(rgb).not.toBe(colorToVuetifyRgb('#FFCDD2'))
      })

      it('should respect a custom on-error text color', () => {
        const theme = createTheme({
          error: '#FFCDD2',
          'on-error': '#000000',
        })
        const { errorChipStyle } = useErrorChipColor(theme)

        expect(errorChipStyle.value).toEqual({
          '--v-theme-error': colorToVuetifyRgb('#FFCDD2'),
        })
      })

      it('should return undefined when the theme has no error color', () => {
        const { errorChipStyle } = useErrorChipColor(createTheme({}))
        expect(errorChipStyle.value).toBeUndefined()
      })

      it('should recompute when the theme error color changes', () => {
        const theme = createTheme({
          error: '#FFCDD2',
          'on-error': '#ffffff',
        })
        const { errorChipStyle } = useErrorChipColor(theme)
        const initialRgb = errorChipStyle.value['--v-theme-error']

        theme.current.value.colors.error = '#B71C1C'

        expect(errorChipStyle.value['--v-theme-error']).toBe(colorToVuetifyRgb('#B71C1C'))
        expect(errorChipStyle.value['--v-theme-error']).not.toBe(initialRgb)
      })
    })
  })
})
