//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  scheduleEventsFromCrontabBlock,
  crontabBlocksFromScheduleEvents,
} from '@/utils/hibernationSchedule'
import moment from '@/utils/moment'

const currentLocation = moment.tz.guess()

describe('utils', () => {
  describe('hibernationSchedule', () => {
    describe('#scheduleEventsFromCrontabBlock', () => {
      it('should parse a simple crontab block', () => {
        const crontabBlock = {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,3,4,5',
          location: 'Europe/Berlin',
        }
        const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
        expect(scheduleEvents).toBeInstanceOf(Array)
        expect(scheduleEvents).toHaveLength(1)
        const { start, end, location } = scheduleEvents[0]
        expect(start).toEqual({ hour: '17', minute: '00', weekdays: '1,2,3,4,5' })
        expect(end).toEqual({ hour: '08', minute: '00', weekdays: '1,2,3,4,5' })
        expect(location).toBe('Europe/Berlin')
      })

      it('should parse a crontab block with different weekdays and no location', () => {
        const crontabBlock = {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,4,6',
        }
        const expectedStartMoment = moment.utc('1700', 'HHmm')
        const expectedEndMoment = moment.utc('0800', 'HHmm')
        const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
        expect(scheduleEvents).toBeInstanceOf(Array)
        expect(scheduleEvents).toHaveLength(2)
        const { start, location } = scheduleEvents[0]
        expect(start).toEqual({
          hour: expectedStartMoment.tz(currentLocation).format('HH'),
          minute: expectedStartMoment.tz(currentLocation).format('mm'),
          weekdays: '1,2,3,4,5',
        })
        expect(location).toBe(currentLocation)
        const { end } = scheduleEvents[1]
        const locationEnd = scheduleEvents[1].location
        expect(end).toEqual({
          hour: expectedEndMoment.tz(currentLocation).format('HH'),
          minute: expectedEndMoment.tz(currentLocation).format('mm'),
          weekdays: '1,2,4,6',
        })
        expect(locationEnd).toBe(currentLocation)
      })
    })

    it('should parse a crontab block with weekday intervals and single weekday', () => {
      const crontabBlock = {
        end: '30 07 * * 1-2,3,4-6,0',
        location: 'Europe/Berlin',
      }
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { end, location } = scheduleEvents[0]
      expect(end).toEqual({
        hour: '07',
        minute: '30',
        weekdays: '1,2,3,4,5,6,0',
      })
      expect(location).toBe('Europe/Berlin')
    })

    it('should parse a crontab block with weekday intervals and single weekday in between and wrong order', () => {
      const crontabBlock = {
        end: '30 07 * * 1-2,Sun,3-5',
        location: 'Europe/Berlin',
      }
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { end, location } = scheduleEvents[0]
      expect(end).toEqual({
        hour: '07',
        minute: '30',
        weekdays: '1,2,0,3,4,5',
      }) // UI will handle correct sorting
      expect(location).toBe('Europe/Berlin')
    })

    it('should parse a crontab block with weekday shortnames and non-standard sunday (7)', () => {
      const crontabBlock = {
        start: '00 20 * * mon,TUE,wEd,Thu,7',
        location: 'America/Los_Angeles',
      }
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { start, location } = scheduleEvents[0]
      expect(start).toEqual({
        hour: '20',
        minute: '00',
        weekdays: '1,2,3,4,0',
      })
      expect(location).toBe('America/Los_Angeles')
    })

    it('should parse a crontab block with all weekdays (*) and no location', () => {
      const crontabBlock = {
        start: '00 20 * * *',
      }
      const expectedStartMoment = moment.utc('2000', 'HHmm')
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { start, location } = scheduleEvents[0]
      expect(start).toEqual({
        hour: expectedStartMoment.tz(currentLocation).format('HH'),
        minute: expectedStartMoment.tz(currentLocation).format('mm'),
        weekdays: '1,2,3,4,5,6,0',
      })
      expect(location).toBe(currentLocation)
    })

    it('should parse a crontab block and remove duplicate weekdays and wrong order', () => {
      const crontabBlock = {
        end: '12 09 * * 1,1,Mon,7,Tue-Thu,4-6',
        location: 'Europe/Berlin',
      }
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { end, location } = scheduleEvents[0]
      expect(end).toEqual({
        hour: '09',
        minute: '12',
        weekdays: '1,0,2,3,4,5,6',
      }) // UI will handle correct sorting
      expect(location).toBe('Europe/Berlin')
    })

    it('should parse a crontab block and translate all weekdays in correct integers', () => {
      const crontabBlock = {
        end: '12 09 * * Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        location: 'Europe/Berlin',
      }
      const scheduleEvents = scheduleEventsFromCrontabBlock(crontabBlock, currentLocation)
      expect(scheduleEvents).toBeInstanceOf(Array)
      expect(scheduleEvents).toHaveLength(1)
      const { end, location } = scheduleEvents[0]
      expect(end).toEqual({
        hour: '09',
        minute: '12',
        weekdays: '1,2,3,4,5,6,0',
      }) // UI will handle correct sorting
      expect(location).toBe('Europe/Berlin')
    })
  })

  describe('#crontabBlocksFromScheduleEvents', () => {
    it('should produce a crontab from an array of scheduleEvents', () => {
      const scheduleEvents = [
        {
          start: {
            hour: '17',
            minute: '00',
            weekdays: '1,2,3,4,5',
          },
          end: {
            hour: '08',
            minute: '00',
            weekdays: '1,2,3,4,5',
          },
          location: 'Europe/Berlin',
        },
        {
          start: {
            hour: '22',
            minute: '00',
            weekdays: '6,0',
          },
          location: 'America/Los_Angeles',
        },
      ]

      const crontabBlocks = crontabBlocksFromScheduleEvents(scheduleEvents)
      const expectedCrontabBlocks = [
        {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,3,4,5',
          location: 'Europe/Berlin',
        },
        {
          start: '00 22 * * 6,0',
          location: 'America/Los_Angeles',
        },
      ]
      expect(crontabBlocks).toBeInstanceOf(Array)
      expect(crontabBlocks).toEqual(expectedCrontabBlocks)
    })
  })
})
