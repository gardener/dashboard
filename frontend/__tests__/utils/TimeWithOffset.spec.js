//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import TimeWithOffset from '@/utils/TimeWithOffset'

describe('utils', () => {
  describe('TimeWithOffset', () => {
    it('should parse time and timezone strings', () => {
      const timeWithOffset = new TimeWithOffset('01:02:03+04:05')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.getTimeString()).toBe('01:02')
      expect(timeWithOffset.getTimezoneString()).toBe('+04:05')
      expect(timeWithOffset.toString()).toBe('01:02 GMT+04:05')
    })

    it('should parse time and timezone strings without colon and without seconds', () => {
      const timeWithOffset = new TimeWithOffset('0102-0405')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.getTimeString()).toBe('01:02')
      expect(timeWithOffset.getTimezoneString()).toBe('-04:05')
      expect(timeWithOffset.toString()).toBe('01:02 GMT-04:05')
    })

    it('should parse time string', () => {
      const timeWithOffset = new TimeWithOffset('01:02')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.getTimeString({ colon: false })).toBe('0102')
    })

    it('should parse timezone string', () => {
      const timeWithOffset = new TimeWithOffset('+01:02')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.getTimezoneString({ colon: false })).toBe('+0102')
    })
  })

  describe('#nextDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })
    it('should return next timestamp iso string', () => {
      const timeWithOffset = new TimeWithOffset('01:02+04:05')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.nextDate().toISOString()).toMatch(/T20:57:00.000Z$/)
      vi.setSystemTime(new Date('2023-01-01T20:56:59Z'))
      expect(timeWithOffset.nextDate().getUTCDate()).toBe(1)
      vi.setSystemTime(new Date('2023-01-01T20:57:00Z'))
      expect(timeWithOffset.nextDate().getUTCDate()).toBe(2)
      vi.setSystemTime(new Date('2023-01-01T20:57:01Z'))
      expect(timeWithOffset.nextDate().getUTCDate()).toBe(2)
    })
  })
})
