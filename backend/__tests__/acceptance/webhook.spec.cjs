//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { cache: { resetTicketCache } } = require('../../dist/lib/cache')
const { loadOpenIssues } = require('../../dist/lib/services/tickets')
const { octokit } = require('../../dist/lib/github')
const RealDate = Date

describe('github', function () {
  let agent
  let cache

  const now = new Date('2006-01-02T15:04:05.000Z')
  const fixed = now.getTime()
  const microDateStr = now.toISOString().replace(/Z$/, '000Z')

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(async () => {
    cache = resetTicketCache()
    await loadOpenIssues()
  })

  describe('#loadOpenIssues', () => {
    it('should initialize the cache with all open issues', async () => {
      expect(octokit.paginate).toHaveBeenCalledTimes(1)

      const issues = cache.getIssues()
      expect(issues).toHaveLength(3)
    })
  })

  describe('event "issues"', function () {
    const githubEvent = 'issues'
    let newGithubIssue

    beforeEach(function () {
      newGithubIssue = fixtures.github.issues.create({ number: 42 })
      mockRequest.mockImplementationOnce(fixtures.leases.mocks.mergePatch())
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    describe('handle valid github webhook', () => {
      beforeAll(() => {
        // Be careful when adding other tests in this block. E.g. express error handlers
        // won't be work when fake timers are enabled as the test in that case never complete.
        // use legacy timers to avoid ClockDate mutations
        jest.useFakeTimers({ legacyFakeTimers: true })

        // The following code is because
        // jest.setSystemTime() is not available when using legacy fake timers.
        // freeze "now" by replacing global Date constructor + Date.now
        function MockDate (...args) {
          if (args.length === 0) {
            return new RealDate(fixed)
          }
          return new RealDate(...args)
        }
        MockDate.UTC = RealDate.UTC
        MockDate.parse = RealDate.parse
        MockDate.now = () => fixed
        MockDate.prototype = RealDate.prototype

        global.Date = MockDate
      })

      afterAll(() => {
        global.Date = RealDate
        jest.useRealTimers()
      })

      it('should succeed if system time matches new value for lease renewTime', async () => {
        const body = JSON.stringify({ action: 'opened', issue: newGithubIssue })

        await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
          .type('application/json')
          .send(body)
          .expect(204)

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest).toHaveBeenCalledWith(
          expect.anything(),
          {
            spec: {
              holderIdentity: fixtures.env.POD_NAME,
              renewTime: microDateStr,
            },
          },
        )
      })
    })

    it('should error on invalid github webhook event', async () => {
      const body = JSON.stringify({ foo: 1 })

      await agent
        .post('/webhook')
        .set('x-github-event', 'unknown_event')
        .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
        .type('application/json')
        .send(body)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(0)
    })

    it('should error if wrong HTTP method is used', async () => {
      const body = JSON.stringify({ action: 'opened', issue: newGithubIssue })

      await agent
        .patch('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
        .type('application/json')
        .send(body)
        .expect((res) => {
          expect(res.status).toEqual(405)
          expect(res.headers.allow).toEqual('POST')
        })

      expect(mockRequest).toHaveBeenCalledTimes(0)
    })
  })
})
