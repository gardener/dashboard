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
  createTonalBackgroundColor,
  pickAccessibleChipColors,
  pickAccessibleTonalColor,
} from '@/composables/useAccessibleChipColor'

useMode(modeRgb)
useMode(modeLrgb)

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

      it('should fall back to white text when the background color cannot be parsed', () => {
        expect(pickAccessibleChipColors('not-a-color')).toEqual({
          background: 'not-a-color',
          textColor: '#ffffff',
          backgroundChanged: false,
          textColorChanged: false,
        })
      })
    })

    describe('#pickAccessibleTonalColor', () => {
      function expectAccessibleTonalColor (color, surface, targetContrast = 4.5) {
        const tonalColor = pickAccessibleTonalColor(color, surface, { targetContrast })
        const tonalBackground = createTonalBackgroundColor(tonalColor, surface)

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
