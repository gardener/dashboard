//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Semaphore = require('../lib/Semaphore')

describe('Semaphore', () => {
  describe('#constructor', () => {
    it('should create semaphore instance', () => {
      const semaphore = new Semaphore()
      expect(semaphore.maxConcurrency).toBe(100)
      expect(semaphore.value).toBe(100)
      semaphore.maxConcurrency = 250
      expect(semaphore.value).toBe(250)
    })
  })

  describe('#aquire', () => {
    it('should create semaphore instance', async () => {
      let release
      const semaphore = new Semaphore(1)
      expect(semaphore.value).toBe(1)
      // acquire first lock
      release = await semaphore.acquire()
      expect(semaphore.value).toBe(0)
      // acquire second lock
      const releasePromise = semaphore.acquire()
      expect(semaphore.value).toBe(-1)
      // release first lock
      release()
      expect(semaphore.value).toBe(0)
      // release is idempotent
      release()
      expect(semaphore.value).toBe(0)
      // release second lock
      release = await releasePromise
      release()
      expect(semaphore.value).toBe(1)
    })
  })
})
