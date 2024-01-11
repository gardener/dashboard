//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useCustomColors } from '@/composables/useCustomColors'

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
        primary: '#0b8062',
      }
      theme.themes.light.colors = {
        background: '#FFFFFF',
        primary: '#0b8062',
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
