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

    describe('relativeTime', () => {
      it('should return human readable descriptions for durations with suffix/prefix', () => {
        expect(dayjs.duration(-7, 'seconds').humanize(true)).toBe('7 seconds ago')
        expect(dayjs.duration(0, 'seconds').humanize(true)).toBe('just now')
        expect(dayjs.duration(1, 'seconds').humanize(true)).toBe('in a second')
        expect(dayjs.duration(7, 'seconds').humanize(true)).toBe('in 7 seconds')
        expect(dayjs.duration(13, 'seconds').humanize(true)).toBe('in a few seconds')
        expect(dayjs.duration(59, 'seconds').humanize(true)).toBe('in a few seconds')
        expect(dayjs.duration(60, 'seconds').humanize(true)).toBe('in a minute')
        expect(dayjs.duration(3, 'minutes').humanize(true)).toBe('in 3 minutes')
        expect(dayjs.duration(5, 'hours').humanize(true)).toBe('in 5 hours')
      })

      it('should return human readable descriptions for relative times with suffix/prefix', () => {
        // to
        expect(dayjs(time + 7 * 1_000).to(time)).toBe('7 seconds ago')
        expect(dayjs(time).to(time)).toBe('just now')
        expect(dayjs(time - 1 * 1_000).to(time)).toBe('in a second')
        expect(dayjs(time - 7 * 1_000).to(time)).toBe('in 7 seconds')
        expect(dayjs(time - 13 * 1_000).to(time)).toBe('in a few seconds')
        expect(dayjs(time - 59 * 1_000).to(time)).toBe('in a few seconds')
        expect(dayjs(time - 1 * 60_000).to(time)).toBe('in a minute')
        expect(dayjs(time - 3 * 60_000).to(time)).toBe('in 3 minutes')
        expect(dayjs(time - 5 * 3600_000).to(time)).toBe('in 5 hours')
        // from
        expect(dayjs(time + 7 * 1_000).from(time)).toBe('in 7 seconds')
        expect(dayjs(time).from(time)).toBe('just now')
        expect(dayjs(time - 1 * 1_000).from(time)).toBe('a second ago')
        expect(dayjs(time - 7 * 1_000).from(time)).toBe('7 seconds ago')
        expect(dayjs(time - 13 * 1_000).from(time)).toBe('a few seconds ago')
        expect(dayjs(time - 59 * 1_000).from(time)).toBe('a few seconds ago')
        expect(dayjs(time - 1 * 60_000).from(time)).toBe('a minute ago')
        expect(dayjs(time - 3 * 60_000).from(time)).toBe('3 minutes ago')
        expect(dayjs(time - 5 * 3600_000).from(time)).toBe('5 hours ago')
      })
    })
  })
})
