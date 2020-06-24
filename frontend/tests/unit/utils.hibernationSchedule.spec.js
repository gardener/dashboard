//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect } from 'chai'
import { parsedScheduleEventsFromCrontabBlock, crontabFromParsedScheduleEvents } from '@/utils/hibernationSchedule'
import store from '@/store'
import moment from 'moment-timezone'

const localTimezone = store.state.localTimezone

describe('utils', function () {
  describe('hibernationSchedule', function () {
    describe('#parsedScheduleEventsFromCrontabBlock', function () {
      it('should parse a simple crontab block', function () {
        const crontabBlock = {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,3,4,5',
          location: 'Europe/Berlin'
        }
        const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
        expect(scheduleEvents).to.be.an.instanceof(Array)
        expect(scheduleEvents).to.have.length(1)
        const { start, end, location } = scheduleEvents[0]
        expect(start).is.eql({ hour: '17', minute: '00', weekdays: '1,2,3,4,5' })
        expect(end).is.eql({ hour: '08', minute: '00', weekdays: '1,2,3,4,5' })
        expect(location).is.equal('Europe/Berlin')
      })

      it('should parse a crontab block with different weekdays and no location', function () {
        const crontabBlock = {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,4,6'
        }
        const expectedStartMoment = moment.utc('1700', 'HHmm')
        const expectedEndMoment = moment.utc('0800', 'HHmm')
        const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
        expect(scheduleEvents).to.be.an.instanceof(Array)
        expect(scheduleEvents).to.have.length(2)
        const { start, location } = scheduleEvents[0]
        expect(start).is.eql({ hour: expectedStartMoment.tz(localTimezone).format('HH'), minute: expectedStartMoment.tz(localTimezone).format('mm'), weekdays: '1,2,3,4,5' })
        expect(location).is.equal(localTimezone)
        const { end } = scheduleEvents[1]
        const locationEnd = scheduleEvents[1].location
        expect(end).is.eql({ hour: expectedEndMoment.tz(localTimezone).format('HH'), minute: expectedEndMoment.tz(localTimezone).format('mm'), weekdays: '1,2,4,6' })
        expect(locationEnd).is.equal(localTimezone)
      })
    })

    it('should parse a crontab block with weekday intervals and single weekday', function () {
      const crontabBlock = {
        end: '30 07 * * 1-2,3,4-6,0',
        location: 'Europe/Berlin'
      }
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { end, location } = scheduleEvents[0]
      expect(end).is.eql({ hour: '07', minute: '30', weekdays: '1,2,3,4,5,6,0' })
      expect(location).is.equal('Europe/Berlin')
    })

    it('should parse a crontab block with weekday intervals and single weekday in between and wrong order', function () {
      const crontabBlock = {
        end: '30 07 * * 1-2,Sun,3-5',
        location: 'Europe/Berlin'
      }
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { end, location } = scheduleEvents[0]
      expect(end).is.eql({ hour: '07', minute: '30', weekdays: '1,2,0,3,4,5' }) // UI will handle correct sorting
      expect(location).is.equal('Europe/Berlin')
    })

    it('should parse a crontab block with weekday shortnames and non-standard sunday (7)', function () {
      const crontabBlock = {
        start: '00 20 * * mon,TUE,wEd,Thu,7',
        location: 'America/Los_Angeles'
      }
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { start, location } = scheduleEvents[0]
      expect(start).is.eql({ hour: '20', minute: '00', weekdays: '1,2,3,4,0' })
      expect(location).is.equal('America/Los_Angeles')
    })

    it('should parse a crontab block with all weekdays (*) and no location', function () {
      const crontabBlock = {
        start: '00 20 * * *'
      }
      const expectedStartMoment = moment.utc('2000', 'HHmm')
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { start, location } = scheduleEvents[0]
      expect(start).is.eql({ hour: expectedStartMoment.tz(localTimezone).format('HH'), minute: expectedStartMoment.tz(localTimezone).format('mm'), weekdays: '1,2,3,4,5,6,0' })
      expect(location).is.equal(localTimezone)
    })

    it('should parse a crontab block and remove duplicate weekdays and wrong order', function () {
      const crontabBlock = {
        end: '12 09 * * 1,1,Mon,7,Tue-Thu,4-6',
        location: 'Europe/Berlin'
      }
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { end, location } = scheduleEvents[0]
      expect(end).is.eql({ hour: '09', minute: '12', weekdays: '1,0,2,3,4,5,6' }) // UI will handle correct sorting
      expect(location).is.equal('Europe/Berlin')
    })

    it('should parse a crontab block and translate all weekdays in correct integers', function () {
      const crontabBlock = {
        end: '12 09 * * Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        location: 'Europe/Berlin'
      }
      const scheduleEvents = parsedScheduleEventsFromCrontabBlock(crontabBlock)
      expect(scheduleEvents).to.be.an.instanceof(Array)
      expect(scheduleEvents).to.have.length(1)
      const { end, location } = scheduleEvents[0]
      expect(end).eql({ hour: '09', minute: '12', weekdays: '1,2,3,4,5,6,0' }) // UI will handle correct sorting
      expect(location).is.equal('Europe/Berlin')
    })
  })

  describe('#crontabFromParsedScheduleEvents', function () {
    it('should produce a crontab from an array of parsedScheduleEvents', function () {
      const parsedScheduleEvents = [
        {
          start: { hour: '17', minute: '00', weekdays: '1,2,3,4,5' },
          end: { hour: '08', minute: '00', weekdays: '1,2,3,4,5' },
          location: 'Europe/Berlin'
        },
        {
          start: { hour: '22', minute: '00', weekdays: '6,0' },
          location: 'America/Los_Angeles'
        }
      ]

      const { scheduleCrontab } = crontabFromParsedScheduleEvents(parsedScheduleEvents)
      const expectedCrontab = [
        {
          start: '00 17 * * 1,2,3,4,5',
          end: '00 08 * * 1,2,3,4,5',
          location: 'Europe/Berlin'
        },
        {
          start: '00 22 * * 6,0',
          location: 'America/Los_Angeles'
        }
      ]
      expect(scheduleCrontab).to.be.an.instanceof(Array)
      expect(scheduleCrontab).to.have.deep.members(expectedCrontab)
    })
  })
})
