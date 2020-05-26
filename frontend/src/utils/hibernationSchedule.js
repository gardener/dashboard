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

import get from 'lodash/get'
import forEach from 'lodash/forEach'
import isEmpty from 'lodash/isEmpty'
import replace from 'lodash/replace'
import split from 'lodash/split'
import join from 'lodash/join'
import flatMap from 'lodash/flatMap'
import uniq from 'lodash/uniq'
import range from 'lodash/range'
import toUpper from 'lodash/toUpper'
import moment from 'moment-timezone'
import store from '../store'
const uuidv4 = require('uuid/v4')

const scheduleCrontabRegex = /^(\d{0,2})\s(\d{0,2})\s\*\s\*\s(([0-7,*-]*|MON|TUE|WED|THU|FRI|SAT|SUN)+)$/

function scheduleEventObjFromRegex (regexVal) {
  const upperRegexVal = toUpper(regexVal)
  const regexResult = scheduleCrontabRegex.exec(upperRegexVal)
  if (regexResult) {
    let [, minute, hour, weekdays] = regexResult

    // replace weekday shortnames, * and 7 with default integer values
    const intVals = {
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
      SUN: 0,
      7: 0,
      '*': '1,2,3,4,5,6,0'
    }
    weekdays = replace(weekdays, /[7*]|MON|TUE|WED|THU|FRI|SAT|SUN/g, weekday => intVals[weekday])

    // convert to array
    weekdays = split(weekdays, ',')

    // resolve intervals
    weekdays = flatMap(weekdays, weekdayOrInterval => {
      if (!/[0-6]-[0-6]/g.test(weekdayOrInterval)) {
        return weekdayOrInterval
      }
      const [leftVal, rightVal] = split(weekdayOrInterval, '-')
      return range(~~leftVal, ~~rightVal + 1)
    })

    // remove duplicates
    weekdays = uniq(weekdays)
    weekdays = join(weekdays, ',')

    return { minute, hour, weekdays }
  }
  return undefined
}

function convertScheduleEventObjToLocalTimezone (scheduleObj) {
  if (scheduleObj) {
    const localTimezone = store.state.localTimezone
    const momentObj = moment.utc()
    momentObj.hour(scheduleObj.hour)
    momentObj.minute(scheduleObj.minute)
    momentObj.tz(localTimezone)
    scheduleObj.hour = momentObj.format('HH')
    scheduleObj.minute = momentObj.format('mm')
  }
  return scheduleObj
}

export function parsedScheduleEventsFromCrontabBlock (crontabBlock) {
  const cronStart = crontabBlock.start
  const cronEnd = crontabBlock.end
  let location = crontabBlock.location
  let start = scheduleEventObjFromRegex(cronStart)
  let end = scheduleEventObjFromRegex(cronEnd)

  if (!location) {
    location = store.state.localTimezone
    start = convertScheduleEventObjToLocalTimezone(start)
    end = convertScheduleEventObjToLocalTimezone(end)
  }

  let parseError = false

  if (cronStart && !start) {
    throw new Error(`Could not parse start crontab line: ${cronStart}`)
  }
  if (cronEnd && !end) {
    parseError = `Could not parse end crontab line: ${cronEnd}`
    parseError = true
  }
  if (!cronStart && !cronEnd) {
    parseError = 'No start or end value in crontab block'
  }
  if (!parseError) {
    const scheduleEvents = []
    const valid = true
    if (start && end && start.weekdays !== end.weekdays) {
      scheduleEvents.push({ start, location, id: uuidv4(), valid })
      scheduleEvents.push({ end, location, id: uuidv4(), valid })
    } else {
      scheduleEvents.push({ start, end, location, id: uuidv4(), valid })
    }
    return scheduleEvents
  }
}

function crontabLineFromParsedScheduleEvent ({ crontabBlock, parsedScheduleEvent, line }) {
  const { weekdays, hour, minute } = get(parsedScheduleEvent, line, {})
  if (parsedScheduleEvent && hour && minute && weekdays) {
    return `${minute} ${hour} * * ${weekdays}`
  }
}

function crontabBlockFromScheduleEvent (parsedScheduleEvent) {
  const crontabBlock = {}
  const parsedScheduleEventStart = crontabLineFromParsedScheduleEvent({ parsedScheduleEvent, line: 'start' })
  if (parsedScheduleEventStart) {
    crontabBlock.start = parsedScheduleEventStart
  }
  const parsedScheduleEventEnd = crontabLineFromParsedScheduleEvent({ parsedScheduleEvent, line: 'end' })
  if (parsedScheduleEventEnd) {
    crontabBlock.end = parsedScheduleEventEnd
  }
  crontabBlock.location = parsedScheduleEvent.location
  return crontabBlock
}

export function crontabFromParsedScheduleEvents (parsedScheduleEvents) {
  const scheduleCrontab = []
  let valid = true
  forEach(parsedScheduleEvents, parsedScheduleEvent => {
    const crontabBlock = crontabBlockFromScheduleEvent(parsedScheduleEvent)
    if (!isEmpty(crontabBlock)) {
      scheduleCrontab.push(crontabBlock)
    } else {
      valid = false
    }
  })
  return { scheduleCrontab, valid }
}
