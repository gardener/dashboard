//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import uniq from 'lodash/uniq'
const uuidv4 = require('uuid/v4')

const scheduleCrontabRegex = /^(\d{0,2})\s(\d{0,2})\s\*\s\*\s(([0-7,*-]*|Mon|Tue|Wed|Thu|Fri|Sat|Sun)+)$/

function scheduleEventObjFromRegex (regex) {
  const regexResult = scheduleCrontabRegex.exec(regex)
  if (regexResult) {
    let [, minute, hour, weekdays] = regexResult

    // replace weekday shortnames, * and 7 with default integer values
    const intVals = {
      'Mon': 1,
      'Tue': 2,
      'Wed': 3,
      'Thu': 4,
      'Fri': 5,
      'Sat': 6,
      'Sun': 7,
      '7': 0,
      '*': '1,2,3,4,5,6,0'
    }
    weekdays = replace(weekdays, /[7*]|Mon|Tue|Wed|Thu|Fri|Sat|Sun/g, weekday => {
      return intVals[weekday]
    })

    // resolve intervals
    weekdays = replace(weekdays, /[0-6]+-[0-6]/g, weekdayInterval => {
      const [leftVal, rightVal] = split(weekdayInterval, '-')
      let flatWeekdays = []
      for (var weekday = leftVal; weekday <= rightVal; weekday++) {
        flatWeekdays.push(weekday)
      }

      return join(flatWeekdays, ',')
    })

    // remove duplicates
    weekdays = split(weekdays, ',')
    weekdays = uniq(weekdays)
    weekdays = join(weekdays, ',')

    return { minute, hour, weekdays }
  }
  return undefined
}

export function parsedScheduleEventsFromCrontabBlock (crontabBlock) {
  const cronStart = crontabBlock.start
  const cronEnd = crontabBlock.end
  const start = scheduleEventObjFromRegex(cronStart)
  const end = scheduleEventObjFromRegex(cronEnd)
  let parseError = false

  if (cronStart && !start) {
    parseError = `Could not parse start crontab line: ${cronStart}`
  }
  if (cronEnd && !end) {
    parseError = `Could not parse end crontab line: ${cronEnd}`
    parseError = true
  }
  if (!cronStart && !cronEnd) {
    parseError = `No start or end value in crontab block`
  }
  if (!parseError) {
    const scheduleEvents = []
    const valid = true
    if (start && end && start.weekdays !== end.weekdays) {
      scheduleEvents.push({ start, id: uuidv4(), valid })
      scheduleEvents.push({ end, id: uuidv4(), valid })
    } else {
      scheduleEvents.push({ start, end, id: uuidv4(), valid })
    }
    return scheduleEvents
  }
  throw new Error(parseError)
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
