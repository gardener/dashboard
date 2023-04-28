//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Lodash
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

// Local
import { v4 as uuidv4 } from './uuid'
import moment from './moment'

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
      '*': '1,2,3,4,5,6,0',
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

function convertScheduleEventObjToLocalTimezone (scheduleObj, location) {
  if (scheduleObj) {
    const momentObj = moment.utc()
      .hour(scheduleObj.hour)
      .minute(scheduleObj.minute)
      .tz(location)
    scheduleObj.hour = momentObj.format('HH')
    scheduleObj.minute = momentObj.format('mm')
  }
  return scheduleObj
}

export function parsedScheduleEventsFromCrontabBlock (crontabBlock, defaultLocation) {
  const cronStart = crontabBlock.start
  const cronEnd = crontabBlock.end
  let location = crontabBlock.location
  let start = scheduleEventObjFromRegex(cronStart)
  let end = scheduleEventObjFromRegex(cronEnd)

  if (!location) {
    location = defaultLocation
    start = convertScheduleEventObjToLocalTimezone(start, location)
    end = convertScheduleEventObjToLocalTimezone(end, location)
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

function crontabLineFromParsedScheduleEvent ({ parsedScheduleEvent, line }) {
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
