//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { cache: { resetTicketCache } } = require('../../lib/cache')
const { loadOpenIssues } = require('../../lib/services/tickets')
const { octokit } = require('../../lib/github')

describe('github', function () {
  let agent
  let cache

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

  describe('#loadOpenIssues', function () {
    it('should initialize the cache with all open issues', async function () {
      expect(octokit.paginate).toBeCalledTimes(1)

      const issues = cache.getIssues()
      expect(issues).toHaveLength(3)
    })
  })

  describe('event "issues"', function () {
    const githubEvent = 'issues'
    let newGithubIssue

    beforeEach(function () {
      newGithubIssue = fixtures.github.issues.create({
        number: 42,
        updated_at: '2006-01-02T15:04:05.000Z'
      })
      mockRequest.mockImplementationOnce(fixtures.leases.mocks.mergePatch())
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should handle valid github webhook', async function () {
      const body = JSON.stringify({ action: 'opened', issue: newGithubIssue })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
        .type('application/json')
        .send(body)
        .expect(204)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest).toBeCalledWith(
        expect.anything(),
        {
          spec: {
            holderIdentity: fixtures.env.POD_NAME,
            renewTime: '2006-01-02T15:04:05.000000Z'
          }
        }
      )
    })

    it('should error on invalid github webhook event', async function () {
      const body = JSON.stringify({ action: 'invalid', issue: {} })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature-256', fixtures.github.createHubSignature(body))
        .type('application/json')
        .send(body)
        .expect(422)

      expect(mockRequest).toBeCalledTimes(0)
    })

    it('should error if wrong HTTP method is used', async function () {
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

      expect(mockRequest).toBeCalledTimes(0)
    })
  })
})
