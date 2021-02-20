//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assign from 'lodash/assign'

class TimeWithOffset {
  constructor (timeString) {
    const timeWithOffsetRegex = /^((\d{2}):?(\d{2}):?(\d{2})?)?(([+-])(\d{2}):?(\d{2}))?$/
    if (!timeWithOffsetRegex.test(timeString)) {
      return undefined
    }
    this.valid = true
    const [, , hours, minutes, , , offsetSign, offsetHours, offsetMinutes] = timeWithOffsetRegex.exec(timeString)
    assign(this,
      {
        hours: '00',
        minutes: '00',
        offsetSign: '+',
        offsetHours: '00',
        offsetMinutes: '00'
      },
      {
        hours,
        minutes,
        offsetSign,
        offsetHours,
        offsetMinutes
      })
  }

  isValid () {
    return this.valid
  }

  toTimeString ({ colon } = { colon: true }) {
    return `${this.hours}${colon ? ':' : ''}${this.minutes}`
  }

  toTimezoneString ({ colon } = { colon: true }) {
    return `${this.offsetSign}${this.offsetHours}${colon ? ':' : ''}${this.offsetMinutes}`
  }

  toString ({ colon } = { colon: true }) {
    return `${this.hours}${colon ? ':' : ''}${this.minutes} GMT${this.offsetSign}${this.offsetHours}${colon ? ':' : ''}${this.offsetMinutes}`
  }
}

export default TimeWithOffset
