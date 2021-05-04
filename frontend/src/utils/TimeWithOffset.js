//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const timeWithOffsetRegex = /^(?:(\d{2}):?(\d{2}):?(\d{2})?)?(?:([+-])(\d{2}):?(\d{2}))?$/

class TimeWithOffset {
  constructor (timeString) {
    const [ok, hours = '00', minutes = '00', , offsetSign = '+', offsetHours = '00', offsetMinutes = '00'] = timeWithOffsetRegex.exec(timeString) || []
    this.valid = !!ok
    Object.assign(this, {
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

  getTimeString ({ colon = true } = {}) {
    return `${this.hours}${colon ? ':' : ''}${this.minutes}`
  }

  getTimezoneString ({ colon = true } = {}) {
    return `${this.offsetSign}${this.offsetHours}${colon ? ':' : ''}${this.offsetMinutes}`
  }

  toString () {
    return `${this.hours}:${this.minutes} GMT${this.offsetSign}${this.offsetHours}:${this.offsetMinutes}`
  }
}

export default TimeWithOffset
