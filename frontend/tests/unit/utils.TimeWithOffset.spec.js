//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import TimeWithOffset from '@/utils/TimeWithOffset'

describe('utils', () => {
  describe('TimeWithOffset', () => {
    it('should parse time and timezone strings', () => {
      const timeWithOffset = new TimeWithOffset('01:02:03+04:05')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.toTimeString()).toBe('01:02')
      expect(timeWithOffset.toTimezoneString()).toBe('+04:05')
      expect(timeWithOffset.toString()).toBe('01:02 GMT+04:05')
    })

    it('should parse time and timezone strings without colon and without seconds', () => {
      const timeWithOffset = new TimeWithOffset('0102-0405')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.toTimeString()).toBe('01:02')
      expect(timeWithOffset.toTimezoneString()).toBe('-04:05')
      expect(timeWithOffset.toString()).toBe('01:02 GMT-04:05')
    })

    it('should parse time string', () => {
      const timeWithOffset = new TimeWithOffset('01:02')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.toTimeString({ colon: false })).toBe('0102')
    })

    it('should parse timezone string', () => {
      const timeWithOffset = new TimeWithOffset('+01:02')
      expect(timeWithOffset.isValid()).toBe(true)
      expect(timeWithOffset.toTimezoneString({ colon: false })).toBe('+0102')
    })
  })
})
