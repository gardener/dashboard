//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest'
import createError from 'http-errors'
import { mockOctokitPaginateGraphQL } from '@octokit/core'
import { dashboardClient } from '@gardener-dashboard/kube-client'
import logger from '../lib/logger/index.js'
import config from '../lib/config/index.js'
import handleGithubEvent from '../lib/github/webhook/handler.js'
import verify from '../lib/github/webhook/verify.js'
import SyncManager from '../lib/github/SyncManager.js'
import { getComments } from '../lib/github/index.js'

const actualNextTick = (await vi.importActual('process')).nextTick

const { UnprocessableEntity, InternalServerError } = createError

const flushPromises = () => new Promise(actualNextTick)
// NOTE: if during an advance action a new timeout with a delay of 0(ms)
// shall be triggered we need to call this fn again but with 1ms as param.
const advanceTimersAndFlushPromises = async (ms) => {
  vi.advanceTimersByTime(ms)
  await flushPromises()
}

describe('github', () => {
  const now = new Date('2006-01-02T15:04:05.000Z')

  describe('webhook', () => {
    describe('handler', () => {
      const namespace = fixtures.env.POD_NAMESPACE
      const holderIdentity = fixtures.env.POD_NAME
      const leaseName = 'gardener-dashboard-github-webhook'
      const microDateStr = now.toISOString().replace(/Z$/, '000Z')
      const dateStr = new Date(microDateStr).toISOString()
      let mergePatchStub
      let createStub

      beforeAll(() => {
        vi.useFakeTimers()
        vi.setSystemTime(now)
      })

      afterAll(() => {
        vi.useRealTimers()
      })

      beforeEach(() => {
        mergePatchStub = vi.spyOn(dashboardClient['coordination.k8s.io'].leases, 'mergePatch')
        createStub = vi.spyOn(dashboardClient['coordination.k8s.io'].leases, 'create')
      })

      it('should throw an error in case of unknown event', async () => {
        await expect(handleGithubEvent('unknown', null)).rejects.toThrow(UnprocessableEntity)
      })

      describe('when the lease exists', () => {
        beforeEach(() => {
          mergePatchStub.mockResolvedValue({})
        })

        it('should update the lease object for an issue event', async () => {
          await handleGithubEvent('issues', { issue: { updated_at: dateStr } })

          const expectedBody = {
            spec: {
              holderIdentity,
              renewTime: microDateStr,
            },
          }
          expect(mergePatchStub).toHaveBeenCalledWith(namespace, leaseName, expectedBody)
        })

        it('should update the lease object for an issue_comment event', async () => {
          const expectedBody = {
            spec: {
              holderIdentity,
              renewTime: microDateStr,
            },
          }

          await handleGithubEvent('issue_comment', { comment: { updated_at: dateStr } })

          expect(mergePatchStub).toHaveBeenCalledWith(namespace, leaseName, expectedBody)
        })

        it('should rethrow errors from underlying kube client', async () => {
          const expectedBody = {
            spec: {
              holderIdentity,
              renewTime: microDateStr,
            },
          }
          mergePatchStub.mockRejectedValueOnce(createError(403, 'Forbidden'))

          await expect(handleGithubEvent('issue_comment', { comment: { updated_at: dateStr } })).rejects.toThrow(InternalServerError)
          expect(mergePatchStub).toHaveBeenCalledWith(namespace, leaseName, expectedBody)
        })
      })

      describe('when the lease does not exist', () => {
        beforeEach(() => {
          mergePatchStub.mockRejectedValueOnce(createError(404, 'Not found'))
          createStub.mockResolvedValue({})
        })

        it('should create the lease object if it is not found', async () => {
          await handleGithubEvent('issues', { issue: { updated_at: dateStr } })

          const expectedBody = {
            metadata: {
              name: leaseName,
            },
            spec: {
              holderIdentity,
              renewTime: microDateStr,
            },
          }
          expect(createStub).toHaveBeenCalledWith(namespace, expectedBody)
        })
      })
    })

    describe('verify', () => {
      const req = {}
      const res = {}
      const body = 'foo'

      const setHubSignatureHeader = body => {
        req.headers['x-hub-signature-256'] = fixtures.github.createHubSignature(body, config.gitHub.webhookSecret)
      }

      beforeEach(() => {
        req.headers = {}
      })

      it('should succeed if signatures match', () => {
        setHubSignatureHeader(body)
        expect(() => verify(req, res, body)).not.toThrow()
      })

      it('should fail in case of an invalid signature', () => {
        setHubSignatureHeader('baz')
        expect(() => verify(req, res, body)).toThrow(createError(403, 'Signatures didn\'t match!'))
      })

      it('should fail if signature is missing', () => {
        expect(() => verify(req, res, body)).toThrow(createError(403, 'Header \'x-hub-signature-256\' not provided or invalid'))
      })

      describe('when webhookSecret is not configured', () => {
        const gitHubConfig = config.gitHub

        beforeEach(() => {
          Object.defineProperty(config, 'gitHub', { value: {} })
        })

        afterEach(() => {
          Object.defineProperty(config, 'gitHub', { value: gitHubConfig })
        })

        it('should fail with an assertion error', () => {
          expect(() => verify(req, res, body)).toThrow(
            expect.objectContaining({
              message: 'Property \'gitHub.webhookSecret\' not configured on dashboard backend',
              code: 'ERR_ASSERTION',
            }),
          )
        })
      })
    })
  })

  describe('SyncManager', () => {
    let abortController
    let syncManagerOpts
    let loadTicketsStub
    const loadTicketsDuration = 500

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
    })

    beforeEach(() => {
      abortController = new AbortController()
      loadTicketsStub = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, loadTicketsDuration)
        })
      })
      syncManagerOpts = {
        signal: abortController.signal,
        interval: 10_000,
        throttle: 2_000,
      }
    })

    afterEach(() => {
      abortController.abort()
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    it('should add an abort listener to the abortsignal', () => {
      const signal = abortController.signal
      vi.spyOn(signal, 'addEventListener')

      // eslint-disable-next-line no-unused-vars
      const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)
      expect(signal.addEventListener).toHaveBeenCalledTimes(1)
      expect(signal.addEventListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })
    })

    it('should be "ready" after first successful sync', async () => {
      const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)
      syncManager.sync()

      await advanceTimersAndFlushPromises(0)
      expect(loadTicketsStub).toHaveBeenCalledTimes(1)
      await advanceTimersAndFlushPromises(loadTicketsDuration)
      expect(syncManager.ready).toEqual(true)
    })

    it('should log errors if the provided loadTickets function errors', async () => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
      loadTicketsStub.mockImplementationOnce(async () => {
        throw Error('test error message')
      })
      const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)
      syncManager.sync()

      vi.advanceTimersByTime(loadTicketsDuration)
      await flushPromises()
      expect(syncManager.ready).toEqual(false)
      expect(errorSpy).toHaveBeenCalledTimes(1)
      errorSpy.mockRestore()
    })

    describe('interval loading of tickets', () => {
      beforeEach(() => {
        syncManagerOpts.throttle = 0 // disable
      })

      it('should load data after idle interval has passed', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        await advanceTimersAndFlushPromises(syncManagerOpts.interval)
        // When the interval is over a new timeout - in this case - with delay of 0 ms is scheduled.
        // vi.advanceTimersByTime(0) does not trigger setTimeout(..., 0). So use 1(ms) here.
        await advanceTimersAndFlushPromises(1)
        expect(loadTicketsStub).toHaveBeenCalledTimes(2)
      })

      it('interval should be reset upon sync call', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)
        const incompleteInterval = Math.ceil(syncManagerOpts.interval * 0.75)

        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        // reset interval by calling sync manually
        await advanceTimersAndFlushPromises(incompleteInterval)
        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(2)

        await advanceTimersAndFlushPromises(incompleteInterval)
        expect(loadTicketsStub).toHaveBeenCalledTimes(2)

        // advance timers so that one full sync interval has passed since last sync()-call
        await advanceTimersAndFlushPromises(syncManagerOpts.interval - incompleteInterval)
        await advanceTimersAndFlushPromises(1)
        expect(loadTicketsStub).toHaveBeenCalledTimes(3)
      })

      it('should stop interval loading on abort', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        abortController.abort()

        await advanceTimersAndFlushPromises(syncManagerOpts.interval * 2)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)
      })
    })

    describe('throttled loading of tickets', () => {
      beforeEach(() => {
        syncManagerOpts.interval = 0 // disable
      })

      it('should throttle calls', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        syncManager.sync()
        await advanceTimersAndFlushPromises(1)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        syncManager.sync() // still within the throttle period after which it should execute

        await advanceTimersAndFlushPromises(syncManagerOpts.throttle)
        expect(loadTicketsStub).toHaveBeenCalledTimes(2)
      })

      it('should run multiple loadTicket invocations in parallel', async () => {
        syncManagerOpts.throttle = 0
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        for (let i = 0; i < 3; i += 1) {
          syncManager.sync()
          await advanceTimersAndFlushPromises(1)
        }

        expect(loadTicketsStub).toHaveBeenCalledTimes(3)
      })

      it('should idle if no new or pending sync calls occure', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        syncManager.sync()

        await advanceTimersAndFlushPromises(syncManagerOpts.throttle)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        vi.runAllTimers()
        await flushPromises()
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)
      })

      it('should not execute pending throttled loads after abort', async () => {
        const syncManager = new SyncManager(loadTicketsStub, syncManagerOpts)

        syncManager.sync()
        syncManager.sync()
        await advanceTimersAndFlushPromises(loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)

        abortController.abort()

        await advanceTimersAndFlushPromises(syncManagerOpts.throttle - loadTicketsDuration)
        expect(loadTicketsStub).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('#getComments', () => {
    it('should pass variables to the Octokit Graphql API', async () => {
      const number = 2
      const owner = 'gardener'
      const repo = 'ticket-dev'
      const comments = await getComments({ number })
      expect(mockOctokitPaginateGraphQL).toHaveBeenCalledTimes(1)
      expect(mockOctokitPaginateGraphQL.mock.calls[0]).toEqual([
        expect.stringMatching(/^query paginate\(\$cursor: String, \$owner: String!, \$repo: String!, \$number: Int!\)/),
        { owner, repo, number },
      ])
      expect(comments).toHaveLength(1)
      expect(comments[0].body).toBe('This is comment 2 for issue #2')
    })

    describe('when the input is invalid', () => {
      it('should throw an \'Invalid Input\' Error', async () => {
        await expect(() => getComments({ number: 'two' })).rejects.toThrow(/^Invalid input:/)
      })
    })
  })
})
