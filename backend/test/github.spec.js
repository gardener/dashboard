//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const crypto = require('crypto')
const { UnprocessableEntity, InternalServerError } = require('http-errors')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const logger = require('../lib/logger')
const config = require('../lib/config')
const { handleGithubEvent } = require('../lib/github/webhookHandler')
const { verify } = require('../lib/github/webhookParser')
const SyncManager = require('../lib/github/syncManager')
const actualNextTick = jest.requireActual('process').nextTick

jest.mock('crypto')
jest.useFakeTimers().setSystemTime(new Date('2023-01-01 00:00:00Z'))

const flushPromises = () => new Promise(actualNextTick)
const advanceTimersAndFlushPromises = async (ms) => {
  jest.advanceTimersByTime(ms)
  await flushPromises()
}

describe('github webhook', function () {
  const namespace = fixtures.config.default.pod.namespace
  const leaseName = 'gardener-dashboard-github-webhook'
  const microDateStr = '2006-01-02T15:04:05.000000Z'
  const dateStr = new Date(microDateStr).toISOString()

  describe('handler', () => {
    let mergePatchStub

    beforeEach(() => {
      mergePatchStub = jest.spyOn(dashboardClient['coordination.k8s.io'].leases, 'mergePatch')
      mergePatchStub.mockResolvedValue({})
    })

    it('should log a warning and throw an error in case of unknown event', async () => {
      await expect(handleGithubEvent('unknown', null)).rejects.toThrow(UnprocessableEntity)
      expect(logger.warn).toBeCalledTimes(1)
    })

    it('should error in case of missing properties in payload', async () => {
      let data = { issue: {} }
      await expect(handleGithubEvent('issues', data)).rejects.toThrow(UnprocessableEntity)
      data = { comment: {} }
      await expect(handleGithubEvent('issue_comment', data)).rejects.toThrow(UnprocessableEntity)
    })

    it('should update the lease object for an issue event', async () => {
      handleGithubEvent('issues', { issue: { updated_at: dateStr } })

      const expectedBody = {
        spec: {
          holderIdentity: config.pod.name,
          renewTime: microDateStr
        }
      }
      expect(mergePatchStub).toBeCalledWith(namespace, leaseName, expectedBody)
    })

    it('should update the lease object for an issue_comment event', async () => {
      const expectedBody = {
        spec: {
          holderIdentity: config.pod.name,
          renewTime: microDateStr
        }
      }

      handleGithubEvent('issue_comment', { comment: { updated_at: dateStr } })

      expect(mergePatchStub).toBeCalledWith(namespace, leaseName, expectedBody)
    })

    it('should log and rethrow errors from underlying kube client', async () => {
      const expectedBody = {
        spec: {
          holderIdentity: config.pod.name,
          renewTime: microDateStr
        }
      }
      mergePatchStub.mockImplementationOnce(() => {
        const err = new Error('Not Found')
        err.code = 404
        throw err
      })

      await expect(handleGithubEvent('issue_comment', { comment: { updated_at: dateStr } })).rejects.toThrow(InternalServerError)
      expect(mergePatchStub).toBeCalledWith(namespace, leaseName, expectedBody)
      expect(logger.error).toBeCalledTimes(1)
    })
  })

  describe('verifier', () => {
    let hmacDigestStub
    let hmacUpdateStub
    const fakeSignature = 'fake signature'.toString('hex')
    const req = {
      headers: {
        'x-hub-signature-256': `sha256=${fakeSignature}`
      }
    }
    const fakeBody = JSON.stringify({ some: 'body' })

    beforeAll(() => {
      hmacUpdateStub = jest.fn()
      hmacDigestStub = jest.fn()
      crypto.timingSafeEqual.mockImplementation((...args) => {
        return jest.requireActual('crypto').timingSafeEqual(...args)
      })
      crypto.createHmac.mockReturnValue({
        update: hmacUpdateStub
      })
      hmacUpdateStub.mockReturnValue({
        digest: hmacDigestStub
      })
    })

    it('should succeed if signatures match', () => {
      hmacDigestStub.mockReturnValueOnce(fakeSignature)

      expect(() => verify(req, {}, fakeBody)).not.toThrow()
      expect(crypto.createHmac).toBeCalledWith('sha256', config.gitHub.webhookSecret)
      expect(hmacUpdateStub).toBeCalledWith(fakeBody)
      expect(hmacDigestStub).toBeCalledWith('hex')
    })

    it('should fail in case of an invalid signature', () => {
      hmacDigestStub.mockReturnValueOnce('invalid-signature')

      expect(() => verify(req, {}, fakeBody)).toThrow()
      expect(crypto.createHmac).toBeCalledWith('sha256', config.gitHub.webhookSecret)
      expect(hmacUpdateStub).toBeCalledWith(fakeBody)
      expect(hmacDigestStub).toBeCalledWith('hex')
    })

    it('should fail if webhookSecret is not configured', () => {
      const gitHubConfig = config.gitHub
      Object.defineProperty(config, 'gitHub', { value: {} })

      let thrownError = null
      try {
        verify(req, {}, fakeBody)
      } catch (err) {
        thrownError = err
      }

      expect(thrownError).not.toBeFalsy()
      expect(thrownError.message).toEqual("Property 'gitHub.webhookSecret' not configured on dashboard backend")
      expect(thrownError.status).toEqual(500)

      Object.defineProperty(config, 'gitHub', { value: gitHubConfig })
    })

    it('should fail if signature is missing', () => {
      let thrownError = null
      try {
        verify({ headers: {} }, {}, fakeBody)
      } catch (err) {
        thrownError = err
      }

      expect(thrownError).not.toBeFalsy()
      expect(thrownError.message).toEqual("Header 'x-hub-signature-256' not provided")
      expect(thrownError.status).toEqual(403)
    })
  })

  describe('syncManager', () => {
    let abortController
    let syncManagerOpts
    const loadTicketsDuration = 500

    beforeAll(() => {
      jest.setSystemTime(new Date('2023-01-01 00:00:00Z'))
    })

    beforeEach(() => {
      jest.resetAllMocks()
      abortController = new AbortController()
      syncManagerOpts = {
        signal: abortController.signal,
        interval: 10_000,
        throttle: 2_000,
        loadTickets: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(resolve, loadTicketsDuration)
          })
        })
      }
    })

    afterEach(() => {
      abortController.abort()
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should add an abort listener to the abortsignal', () => {
      const signal = abortController.signal
      jest.spyOn(signal, 'addEventListener')

      // eslint-disable-next-line no-unused-vars
      const syncManager = new SyncManager(syncManagerOpts)
      expect(signal.addEventListener).toBeCalledTimes(1)
      expect(signal.addEventListener).toBeCalledWith('abort', expect.any(Function), { once: true })
    })

    it('should trigger an initial sync on start', async () => {
      const syncManager = new SyncManager(syncManagerOpts)
      syncManager.start()

      expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)
      await advanceTimersAndFlushPromises(loadTicketsDuration)
      expect(syncManager.ready).toEqual(true)
    })

    it('should log errors if the provided loadTickets function errors', async () => {
      syncManagerOpts.loadTickets.mockImplementationOnce(async () => {
        throw Error('test error message')
      })
      const syncManager = new SyncManager(syncManagerOpts)
      syncManager.start()

      jest.advanceTimersByTime(loadTicketsDuration)
      await flushPromises()
      expect(syncManager.ready).toEqual(false)
      expect(logger.error).toBeCalledTimes(1)
    })

    describe('interval loading', () => {
      beforeEach(() => {
        syncManagerOpts.throttle = 0 // disable
      })

      it('should load data after idle interval has passed', async () => {
        const syncManager = new SyncManager(syncManagerOpts)

        syncManager.start()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        await advanceTimersAndFlushPromises(syncManagerOpts.interval)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(2)
      })

      it('interval should be reset upon sync call', async () => {
        const syncManager = new SyncManager(syncManagerOpts)
        const incompleteInterval = Math.ceil(syncManagerOpts.interval * 0.75)

        syncManager.start()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        // reset interval by calling sync manually
        await advanceTimersAndFlushPromises(incompleteInterval)
        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(2)

        await advanceTimersAndFlushPromises(incompleteInterval)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(2)

        // advance timers so that one full sync interval has passed since last sync()-call
        await advanceTimersAndFlushPromises(syncManagerOpts.interval - incompleteInterval)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(3)
      })

      it('should stop interval loading on abort', async () => {
        const syncManager = new SyncManager(syncManagerOpts)

        syncManager.start()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        abortController.abort()

        await advanceTimersAndFlushPromises(syncManagerOpts.interval)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)
      })
    })

    describe('call throttling and no parallel loads', () => {
      beforeEach(() => {
        syncManagerOpts.interval = 0 // disable
      })

      it('should throttle calls', async () => {
        const syncManager = new SyncManager(syncManagerOpts)

        syncManager.sync()
        syncManager.sync()

        jest.advanceTimersByTime(syncManagerOpts.throttle)
        await flushPromises()
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        jest.advanceTimersByTime(syncManagerOpts.throttle)
        await flushPromises()
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(2)
      })

      it('should not run multiple loadTicket invocations in parallel', async () => {
        syncManagerOpts.throttle = 0
        const syncManager = new SyncManager(syncManagerOpts)

        for (let i = 0; i < 3; i += 1) {
          syncManager.sync()
        }

        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        jest.advanceTimersByTime(loadTicketsDuration)
        await flushPromises()
        jest.advanceTimersByTime(0)

        expect(syncManagerOpts.loadTickets).toBeCalledTimes(2)
      })

      it('should idle if no new or pending sync calls occure', async () => {
        const syncManager = new SyncManager(syncManagerOpts)

        syncManager.sync()

        await advanceTimersAndFlushPromises(syncManagerOpts.throttle)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        jest.runAllTimers()
        await flushPromises()
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)
      })

      it('should not execute pending throttled loads after abort', async () => {
        const syncManager = new SyncManager(syncManagerOpts)

        syncManager.start()
        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)

        abortController.abort()

        await advanceTimersAndFlushPromises(syncManagerOpts.throttle - loadTicketsDuration)
        expect(syncManagerOpts.loadTickets).toBeCalledTimes(1)
      })
    })
  })
})
