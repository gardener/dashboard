//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function splitIntoPairs (str) {
  if (str.length % 2 !== 0) {
    return null
  }

  const parts = []
  for (let i = 0; i < str.length; i += 2) {
    parts.push(str.slice(i, i + 2))
  }

  if (!parts.every(part => /^\d{2}$/.test(part))) {
    return null
  }

  return parts
}

class TimeWithOffset {
  constructor (value) {
    let time = value
    let offsetSign = '+'
    let offset = '00:00'

    const index = value.search(/[+-]/)
    if (index !== -1) {
      time = value.substring(0, index)
      offsetSign = value[index]
      offset = value.substring(index + 1)
    }

    const timeParts = splitIntoPairs(time.replaceAll(':', ''))
    const [
      hours = '00',
      minutes = '00',
    ] = Array.isArray(timeParts)
      ? timeParts
      : []

    const offsetParts = splitIntoPairs(offset.replaceAll(':', ''))
    const [
      offsetHours = '00',
      offsetMinutes = '00',
    ] = Array.isArray(offsetParts)
      ? offsetParts
      : []

    this.valid = !!(timeParts && offsetParts)
    Object.assign(this, {
      hours,
      minutes,
      offsetSign,
      offsetHours,
      offsetMinutes,
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

  nextDate () {
    let date = new Date()
    const now = date.getTime()
    date = new Date(date.toISOString().substring(0, 11) + this.getTimeString() + this.getTimezoneString())
    while (date.getTime() <= now) {
      date.setUTCDate(date.getUTCDate() + 1)
    }
    return date
  }
}

export default TimeWithOffset
