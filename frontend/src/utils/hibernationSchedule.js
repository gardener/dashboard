//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { v4 as uuidv4 } from './uuid'
import moment from './moment'

import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import replace from 'lodash/replace'
import split from 'lodash/split'
import join from 'lodash/join'
import flatMap from 'lodash/flatMap'
import uniq from 'lodash/uniq'
import range from 'lodash/range'
import toUpper from 'lodash/toUpper'

export function parseCronExpression (value) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = toUpper(value).split(/\s/)
  if (
    !/^\d{1,2}$/.test(minute) ||
    !/^\d{1,2}$/.test(hour) ||
    dayOfMonth !== '*' ||
    month !== '*' ||
    !/^[A-Z0-7*,-]+$/.test(dayOfWeek)
  ) {
    return
  }

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
  let weekdays = replace(dayOfWeek, /([7*]|MON|TUE|WED|THU|FRI|SAT|SUN)/g, weekday => get(intVals, [weekday]))

  // convert to array
  weekdays = split(weekdays, ',')
  if (!weekdays.every(day => /^([0-6]|[0-6]-[0-6])$/.test(day))) {
    return
  }

  // resolve intervals
  weekdays = flatMap(weekdays, weekdayOrInterval => {
    if (!/[0-6]-[0-6]/g.test(weekdayOrInterval)) {
      return weekdayOrInterval
    }
    const [leftVal, rightVal] = split(weekdayOrInterval, '-')
    return range(+leftVal, +rightVal + 1)
  })

  // remove duplicates
  weekdays = uniq(weekdays)
  weekdays = join(weekdays, ',')

  return { minute, hour, weekdays }
}

function formatCronExpression (scheduleEventLine) {
  const { minute, hour, weekdays } = scheduleEventLine ?? {}
  return minute && hour && weekdays
    ? `${minute} ${hour} * * ${weekdays}`
    : undefined
}

function convertScheduleEventLineToLocalTimezone (scheduleEventLine, location) {
  if (scheduleEventLine) {
    const date = moment.utc()
      .hour(scheduleEventLine.hour)
      .minute(scheduleEventLine.minute)
      .tz(location)
    scheduleEventLine.hour = date.format('HH')
    scheduleEventLine.minute = date.format('mm')
  }
  return scheduleEventLine
}

function createCronExpressionSyntaxError (message) {
  const error = new Error(message)
  error.name = 'CronExpressionSyntaxError'
  return error
}

export function scheduleEventsFromCrontabBlock (crontabBlock, defaultLocation) {
  const cronStart = crontabBlock.start
  const cronEnd = crontabBlock.end
  let location = crontabBlock.location
  let start = parseCronExpression(cronStart)
  let end = parseCronExpression(cronEnd)

  if (!location) {
    location = defaultLocation
    start = convertScheduleEventLineToLocalTimezone(start, location)
    end = convertScheduleEventLineToLocalTimezone(end, location)
  }

  if (cronStart && !start) {
    throw createCronExpressionSyntaxError(`Could not parse start crontab line: ${cronStart}`)
  }
  if (cronEnd && !end) {
    throw createCronExpressionSyntaxError(`Could not parse end crontab line: ${cronEnd}`)
  }
  if (!cronStart && !cronEnd) {
    throw createCronExpressionSyntaxError('No start or end value in crontab block')
  }

  const scheduleEvents = []
  const pushScheduleEvent = scheduleEvent => {
    Object.defineProperty(scheduleEvent, 'id', {
      value: uuidv4(),
    })
    Object.defineProperty(scheduleEvent, 'valid', {
      value: true,
      writable: true,
    })
    scheduleEvents.push(scheduleEvent)
  }
  if (start && end && start.weekdays !== end.weekdays) {
    pushScheduleEvent({ start, location })
    pushScheduleEvent({ end, location })
  } else {
    pushScheduleEvent({ start, end, location })
  }

  return scheduleEvents
}

export function scheduleEventsFromCrontabBlocks (crontabBlocks, defaultLocation) {
  return flatMap(crontabBlocks, crontabBlock => scheduleEventsFromCrontabBlock(crontabBlock, defaultLocation))
}

function crontabBlockFromScheduleEvent (scheduleEvent) {
  const crontabBlock = {
    location: scheduleEvent.location,
  }
  const start = formatCronExpression(scheduleEvent.start)
  if (start) {
    crontabBlock.start = start
  }
  const end = formatCronExpression(scheduleEvent.end)
  if (end) {
    crontabBlock.end = end
  }
  return crontabBlock
}

export function crontabBlocksFromScheduleEvents (scheduleEvents) {
  const crontabBlocks = []
  for (const scheduleEvent of scheduleEvents) {
    const crontabBlock = crontabBlockFromScheduleEvent(scheduleEvent)
    if (!isEmpty(crontabBlock)) {
      crontabBlocks.push(crontabBlock)
    }
  }
  return crontabBlocks
}

export function crontabFromParsedScheduleEvents (scheduleEvents) {
  const scheduleCrontab = []
  let valid = true
  for (const scheduleEvent of scheduleEvents) {
    const crontabBlock = crontabBlockFromScheduleEvent(scheduleEvent)
    if (!isEmpty(crontabBlock)) {
      scheduleCrontab.push(crontabBlock)
    } else {
      valid = false
    }
  }
  return { scheduleCrontab, valid }
}

export function parseTimeString (time) {
  const date = moment(time, 'HHmm')
  if (date.isValid()) {
    return {
      hour: date.format('HH'),
      minute: date.format('mm'),
    }
  }
  return null
}

export function formatTimeString ({ hour, minute } = {}) {
  if (hour && minute) {
    const date = moment()
      .hour(hour)
      .minute(minute)
    if (date.isValid()) {
      return date.format('HH:mm')
    }
  }
  return ''
}
