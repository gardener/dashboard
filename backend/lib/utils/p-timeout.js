//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

export class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function pTimeout (promise, milliseconds, message = `Promise timed out after ${milliseconds} milliseconds`) {
  if (typeof milliseconds !== 'number' || milliseconds < 0) {
    throw new TypeError('Milliseconds must be a positive number')
  }

  let timeoutId

  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(message)), milliseconds)
  })

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

export default pTimeout
