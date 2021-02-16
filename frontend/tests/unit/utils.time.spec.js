//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  parseTimeWithOffset,
  toTimeWithOffset,
  parseTime,
  guessLocation,
  getTimezone,
  humanizeDuration,
  randomMaintenanceBegin,
  getMaintenanceWindow
} from '@/utils/time'

describe('utils.time', () => {
  describe('parseTimeWithOffset', () => {
    it('should parse time with offset', () => {
      const {
        timeHour,
        timeMinute,
        timeSeconds,
        offsetSign,
        offsetHour,
        offsetMinute,
        timezone
      } = parseTimeWithOffset('140923-0100')
      expect(timeHour).toBe('14')
      expect(timeMinute).toBe('09')
      expect(timeSeconds).toBe('23')
      expect(offsetSign).toBe('-')
      expect(offsetHour).toBe('01')
      expect(offsetMinute).toBe('00')
      expect(timezone).toBe('UTC-01:00')
    })
  })

  describe('toTimeWithOffset', () => {
    it('should parse time, no timezone given', () => {
      const timeString = toTimeWithOffset('22:12')
      expect(timeString).toBe('221200+0000')
    })

    it('should parse time, timezone provided', () => {
      const timeString = toTimeWithOffset('01:59:12', 'UTC-01:30')
      expect(timeString).toBe('015912-0130')
    })
  })

  describe('parseTime', () => {
    it('should parse time', () => {
      const {
        hour,
        minute,
        seconds
      } = parseTime('13:42')
      expect(hour).toBe('13')
      expect(minute).toBe('42')
      expect(seconds).toBe('00')
    })
  })

  describe('guessLocation', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should guess the current location', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        return {
          resolvedOptions: () => {
            return {
              timeZone: 'Pacific/Honolulu'
            }
          }
        }
      })

      const location = guessLocation()
      expect(location).toBe('Pacific/Honolulu')
    })

    it('should fallback to UTC if location cannot be guessed / is not in list', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        return {
          resolvedOptions: () => {
            return {
              timeZone: 'Europe/Hogwarts'
            }
          }
        }
      })

      const location = guessLocation()
      expect(location).toBe('UTC')
    })
  })

  describe('getTimezone', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should calculate the current timezone', () => {
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-165)

      const timezone = getTimezone()
      expect(timezone).toBe('UTC+02:45')
    })
  })

  describe('humanizeDuration', () => {
    it('should humanize a time difference with full accuracy', () => {
      const date1 = new Date(0)
      const date2 = new Date(89179279400)
      const humanizedDuration = humanizeDuration(date1, date2, 7)
      expect(humanizedDuration).toBe('2 years and 10 months and 0 weeks and a day and 16 hours and 22 minutes and 55 seconds')
    })

    it('should round last value if shortened', () => {
      const date1 = new Date(0)
      const date2 = new Date(89179279400)
      let humanizedDuration = humanizeDuration(date1, date2, 6)
      expect(humanizedDuration).toBe('2 years and 10 months and 0 weeks and a day and 16 hours and 23 minutes') // round up

      humanizedDuration = humanizeDuration(date1, date2, 5)
      expect(humanizedDuration).toBe('2 years and 10 months and 0 weeks and a day and 16 hours') // round down

      humanizedDuration = humanizeDuration(date1, date2, 4)
      expect(humanizedDuration).toBe('2 years and 10 months and 0 weeks and 2 days') // round up

      humanizedDuration = humanizeDuration(date1, date2) // default length = 1
      expect(humanizedDuration).toBe('3 years') // round up
    })

    it('should not include last value if zero', () => {
      const date1 = new Date(0)
      const date2 = new Date(89179279400)
      const humanizedDuration = humanizeDuration(date1, date2, 3)
      expect(humanizedDuration).toBe('2 years and 10 months')
    })

    it('should humanize few seconds', () => {
      const date1 = new Date(0)
      const date2 = new Date(20)
      const humanizedDuration = humanizeDuration(date1, date2, 3)
      expect(humanizedDuration).toBe('a few seconds')
    })
  })

  describe('randomMaintenanceBegin', () => {
    it('should return a random maintenance window', () => {
      const randomBegin = randomMaintenanceBegin()
      expect(randomBegin).toMatch(/\d{2}:00/)
    })
  })

  describe('getMaintenanceWindow', () => {
    it('should return a maintenance window', () => {
      const {
        begin,
        end
      } = getMaintenanceWindow('23:00', 'UTC+02:30')
      expect(begin).toBe('230000+0230')
      expect(end).toBe('000000+0230')
    })
  })
})
