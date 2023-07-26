//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import dayjs from '@/utils/moment'

describe('utils', () => {
  describe('moment', () => {
    const time = 1618395714020
    const date = '2012-02-17T12:00:00+01:25'

    describe('core', () => {
      it('should format a date', () => {
        expect(dayjs(time).format('YYYY-MM-DD')).toBe('2021-04-14')
        expect(dayjs(date).format('YYYY-MM-DD')).toBe('2012-02-17')
      })
    })

    describe('timezone', () => {
      it('should return all locations', () => {
        const locations = dayjs.tz.names()
        expect(locations).toHaveLength(593)
        expect(locations).toEqual(expect.arrayContaining([
          'UTC',
          'CET',
          'MST',
          'Europe/Berlin',
          'America/Los_Angeles',
        ]))
      })
      it('should guess the location', () => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        expect(dayjs.tz.guess()).toEqual(timeZone)
      })
    })

    describe('utc', () => {
      it('should format a utc date', () => {
        expect(dayjs.utc(time).format()).toBe('2021-04-14T10:21:54Z')
      })

      it('should parse utc dates with different patterns', () => {
        const utcToTimezone = (time, location) => {
          const obj = dayjs.utc(time, 'HHmm').tz(location)
          return {
            hour: obj.format('HH'),
            minute: obj.format('mm'),
          }
        }
        expect(utcToTimezone('1700', 'HST')).toEqual({
          hour: '07',
          minute: '00',
        })
        expect(utcToTimezone('0800', 'MST')).toEqual({
          hour: '01',
          minute: '00',
        })
      })

      it('should convert utc dates to different timezones', () => {
        const utcToTimezone = (hour, minute, location) => {
          const obj = dayjs.utc()
            .hour(hour)
            .minute(minute)
            .tz(location)
          return {
            hour: obj.format('HH'),
            minute: obj.format('mm'),
          }
        }
        expect(utcToTimezone(13, 42, 'MST')).toEqual({
          hour: '06',
          minute: '42',
        })
        expect(utcToTimezone(17, 7, 'HST')).toEqual({
          hour: '07',
          minute: '07',
        })
      })
    })

    describe('localizedFormat', () => {
      it('should format a date', () => {
        const toLocalFormat = time => dayjs(time).format('lll')
        expect(toLocalFormat(time)).toMatch(/^Apr \d{2}, 2021 \d{2}:\d{2} (AM|PM)$/)
        expect(toLocalFormat(date)).toMatch(/^Feb \d{2}, 2012 \d{2}:\d{2} (AM|PM)$/)
      })
    })
  })
})
