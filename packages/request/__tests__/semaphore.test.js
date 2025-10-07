//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Semaphore from '../lib/Semaphore.js'

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
    let acquireResult
    let release
    let concurrency

    it('should create semaphore instance', async () => {
      const semaphore = new Semaphore(1)
      expect(semaphore.value).toBe(1)
      // acquire first lock
      acquireResult = await semaphore.acquire()
      release = acquireResult[0]
      concurrency = acquireResult[1]
      expect(concurrency).toBe(1)
      expect(semaphore.concurrency).toBe(1)
      expect(semaphore.value).toBe(0)
      // acquire second lock
      const acquirePromise = semaphore.acquire()
      expect(semaphore.concurrency).toBe(1)
      expect(semaphore.value).toBe(-1)
      // release first lock
      release()
      expect(semaphore.value).toBe(0)
      // release is idempotent
      release()
      expect(semaphore.value).toBe(0)
      // release second lock
      acquireResult = await acquirePromise
      release = acquireResult[0]
      concurrency = acquireResult[1]
      expect(concurrency).toBe(1)
      expect(semaphore.concurrency).toBe(1)
      release()
      expect(semaphore.concurrency).toBe(0)
      expect(semaphore.value).toBe(1)
    })
  })
})
