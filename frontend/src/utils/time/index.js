//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import includes from 'lodash/includes'
import sample from 'lodash/sample'
import join from 'lodash/join'
import padStart from 'lodash/padStart'
import map from 'lodash/map'
import takeWhile from 'lodash/takeWhile'
import { locations } from './locations'

// Expected input format: hhmmss+-hhmm
export function parseTimeWithOffset (time) {
  const timeRegex = /^(\d{2})(\d{2})(\d{2})([+-])(\d{2})(\d{2})$/
  if (!timeRegex.test(time)) {
    return undefined
  }
  const [, timeHour, timeMinute, timeSeconds, offsetSign, offsetHour, offsetMinute] = timeRegex.exec(time)
  let timezone = 'UTC'
  if (offsetHour > 0) {
    timezone = `UTC${offsetSign}${offsetHour}:${offsetMinute}`
  }

  return {
    timeHour,
    timeMinute,
    timeSeconds,
    offsetSign,
    offsetHour,
    offsetMinute,
    timezone
  }
}

// Expected input Format: hh:mm(:ss) + timezone
// Output format: hhmmss+-hhmm
export function toTimeWithOffset (time, timezone) {
  const parsedTime = parseTime(time)
  if (!parsedTime) {
    return
  }
  const { hour, minute, seconds } = parsedTime

  const timezoneRegex = /^UTC([+-])(\d{2}):(\d{2})$/
  let offset = '+0000'
  if (timezoneRegex.test(timezone)) {
    const [, sign, hour, minute] = timezoneRegex.exec(timezone)
    offset = `${sign}${hour}${minute}`
  }

  return `${hour}${minute}${seconds}${offset}`
}

// Expected input format: hh:mm(:ss)
export function parseTime (time) {
  const timeRegex = /^(\d{2}):(\d{2}):?(\d{2})?$/
  if (!timeRegex.test(time)) {
    return
  }
  const timeArray = timeRegex.exec(time)
  let [, hour, minute, seconds] = timeArray
  if (!seconds) {
    seconds = '00'
  }
  return {
    hour,
    minute,
    seconds
  }
}

// Guess current location or fallback to UTC
export function guessLocation () {
  let location = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (!includes(locations, location)) {
    location = 'UTC'
  }
  return location
}

// Return current timezone
export function getTimezone () {
  var offset = new Date().getTimezoneOffset()
  var sign = offset < 0 ? '+' : '-'
  offset = Math.abs(offset)
  const hour = padStart(Math.floor(offset / 60), 2, '0')
  const minute = padStart(offset % 60, 2, '0')
  return `UTC${sign}${hour}:${minute}`
}

// Expected input: parsable date string
export function humanizeDuration (refDate, date, length = 1) {
  const refTimestamp = new Date(refDate).getTime()
  const timestamp = new Date(date).getTime()

  let duration = 0
  if (refTimestamp > timestamp) {
    duration = refTimestamp - timestamp
  }
  if (timestamp > refTimestamp) {
    duration = timestamp - refTimestamp
  }
  duration = duration / 1000

  if (duration < 30) {
    return 'a few seconds'
  }

  const years = {
    actual: Math.floor(duration / 31556952),
    rounded: Math.round(duration / 31556952),
    weight: 6,
    multipleText: 'years',
    singleText: 'a year'
  }
  duration = duration % 31556952
  const months = {
    actual: Math.floor(duration / 2592000),
    rounded: Math.round(duration / 2592000),
    weight: 5,
    multipleText: 'months',
    singleText: 'a month'
  }
  duration = duration % 2592000
  const weeks = {
    actual: Math.floor(duration / 604800),
    rounded: Math.round(duration / 604800),
    weight: 4,
    multipleText: 'weeks',
    singleText: 'a week'
  }
  duration = duration % 604800
  const days = {
    actual: Math.floor(duration / 86400),
    rounded: Math.round(duration / 86400),
    weight: 3,
    multipleText: 'days',
    singleText: 'a day'
  }
  duration = duration % 86400
  const hours = {
    actual: Math.floor(duration / 3600),
    rounded: Math.round(duration / 3600),
    weight: 2,
    multipleText: 'hours',
    singleText: ' an hour'
  }
  duration = duration % 3600
  const minutes = {
    actual: Math.floor(duration / 60),
    rounded: Math.round(duration / 60),
    weight: 1,
    multipleText: 'minutes',
    singleText: 'a minute'
  }
  const seconds = {
    actual: Math.floor(duration % 60),
    rounded: Math.round(duration % 60),
    weight: 0,
    multipleText: 'seconds',
    singleText: 'a second'
  }

  const durationStrings = []
  const addDurationString = (durationStrings, durationObject) => {
    const isLastPart = durationStrings.length === length - 1
    const value = isLastPart ? durationObject.rounded : durationObject.actual
    if (value === 1) {
      durationStrings.push({ weight: durationObject.weight, value: durationObject.singleText })
    } else if (!isLastPart || value > 0) { // do not add if last part is zero
      durationStrings.push({ weight: durationObject.weight, value: `${value} ${durationObject.multipleText}` })
    }
  }

  addDurationString(durationStrings, years)
  addDurationString(durationStrings, months)
  addDurationString(durationStrings, weeks)
  addDurationString(durationStrings, days)
  addDurationString(durationStrings, hours)
  addDurationString(durationStrings, minutes)
  addDurationString(durationStrings, seconds)

  const validStrings = takeWhile(durationStrings, (value, index, array) => {
    if (index === 0) {
      return true
    }
    if (index >= length) {
      return false
    }

    // if last aprt is zero (= not in durationStrings): prevent that next part is added instead
    return durationStrings[index - 1].weight - durationStrings[index].weight === 1
  })
  return join(map(validStrings, 'value'), ' and ')
}

// Expected input: parsable date string
export function humanizeDurationTo (refDate, date) {
  const durationString = humanizeDuration(refDate, date)
  return `in ${durationString}`
}

// Expected input: parsable date string
export function humanizeDurationFrom (refDate, date) {
  const durationString = humanizeDuration(refDate, date)
  return `${durationString} ago`
}

// Returns random time with format hh:mm
export function randomMaintenanceBegin () {
  // randomize maintenance time window
  const hours = ['22', '23', '00', '01', '02', '03', '04', '05']
  const randomHour = sample(hours)
  return `${randomHour}:00`
}

// Expects time with format hh:mm and timezone
export function getMaintenanceWindow (maintenanceBegin, timezone) {
  const parsedBegin = parseTime(maintenanceBegin)
  const beginHour = new Date(0, 0, 0, parsedBegin.hour, 0, 0)
  const endHour = new Date(beginHour.getTime() + (60 * 60 * 1000)) // add one hour
  const maintenanceEnd = `${padStart(endHour.getHours(), 2, '0')}:${parsedBegin.minute}`

  return {
    begin: toTimeWithOffset(maintenanceBegin, timezone),
    end: toTimeWithOffset(maintenanceEnd, timezone)
  }
}
