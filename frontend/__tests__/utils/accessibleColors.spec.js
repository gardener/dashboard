//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  modeLrgb,
  modeRgb,
  useMode,
  wcagContrast,
} from 'culori/fn'

import {
  pickAccessibleTextColor,
  createTonalBackgroundColor,
  pickAccessibleTonalColor,
} from '@/utils/accessibleColors'

useMode(modeRgb)
useMode(modeLrgb)

describe('utils', () => {
  describe('accessibleColors', () => {
    describe('#pickAccessibleTextColor', () => {
      it('should prefer white text when it meets AA contrast', () => {
        const background = '#D73A4A'
        const textColor = pickAccessibleTextColor(background)

        expect(textColor).toBe('#ffffff')
        expect(wcagContrast(background, textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should use black text when white does not meet AA contrast', () => {
        const background = '#E57373'
        const textColor = pickAccessibleTextColor(background)

        expect(textColor).toBe('#000000')
        expect(wcagContrast(background, textColor)).toBeGreaterThanOrEqual(4.5)
      })

      it('should fall back to white text when the background color cannot be parsed', () => {
        expect(pickAccessibleTextColor('not-a-color')).toBe('#ffffff')
      })
    })

    describe('#pickAccessibleTonalColor', () => {
      function expectAccessibleTonalColor (color, surfaceColor, targetContrast = 4.5) {
        const tonalColor = pickAccessibleTonalColor(color, surfaceColor, { targetContrast })
        const tonalBackground = createTonalBackgroundColor(tonalColor, surfaceColor)

        expect(tonalColor).toMatch(/^#[0-9a-f]{6}$/i)
        expect(tonalBackground).toMatch(/^#[0-9a-f]{6}$/)
        expect(wcagContrast(tonalColor, tonalBackground)).toBeGreaterThanOrEqual(targetContrast)
        return tonalColor
      }

      it('should keep a color when its tonal contrast already passes', () => {
        const color = '#BF360C'
        const tonalColor = expectAccessibleTonalColor(color, '#ffffff')

        expect(tonalColor).toBe(color)
      })

      it('should darken a low-contrast color on a light surface', () => {
        const color = '#E65100'
        const tonalColor = expectAccessibleTonalColor(color, '#ffffff')

        expect(tonalColor).not.toBe(color)
      })

      it('should adjust low-contrast success colors as well as warning colors', () => {
        const color = '#388E3C'
        const tonalColor = expectAccessibleTonalColor(color, '#ffffff')

        expect(tonalColor).not.toBe(color)
      })

      it('should lighten a low-contrast color on a dark surface', () => {
        const color = '#808080'
        const tonalColor = expectAccessibleTonalColor(color, '#121212')

        expect(tonalColor).not.toBe(color)
      })

      it('should support a higher requested contrast target', () => {
        const tonalColor = expectAccessibleTonalColor('#60C0A0', '#121212', 7)

        expect(tonalColor).toBeDefined()
      })

      it('should return undefined when a color cannot be parsed', () => {
        expect(pickAccessibleTonalColor('not-a-color', '#ffffff')).toBeUndefined()
        expect(pickAccessibleTonalColor('#000000', 'not-a-color')).toBeUndefined()
      })
    })
  })
})
