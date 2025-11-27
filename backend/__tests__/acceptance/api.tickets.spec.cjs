//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { mockListIssues, mockListComments } = require('@octokit/core')
const tickets = require('../../dist/lib/services/tickets')

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(async () => {
    mockListIssues.mockReturnValue([
      fixtures.github.createIssue(1, 'foo'),
      fixtures.github.createIssue(2, 'bar', { comments: 1 }),
      fixtures.github.createIssue(3, 'foobar'),
      fixtures.github.createIssue(4, 'foo', { comments: 1, state: 'closed' }),
    ])
    mockListComments.mockReturnValue([
      fixtures.github.createComment(1, 2),
      fixtures.github.createComment(2, 4),
    ])
    await tickets.loadOpenIssues()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('tickets', function () {
    const user = fixtures.auth.createUser({
      id: 'foo@example.org',
    })

    it('should fetch open issues for all namespaces', async () => {
      const namespace = '_all'

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockListIssues).toHaveBeenCalledTimes(1)
      expect(mockListComments).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should fetch open issues for namespace foo', async () => {
      const namespace = 'garden-foo'

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockListIssues).toHaveBeenCalledTimes(1)
      expect(mockListComments).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should fetch open issues and comments for shoot cluster test in namespace bar', async () => {
      const namespace = 'garden-bar'
      const name = 'test'

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockListIssues).toHaveBeenCalledTimes(1)
      expect(mockListComments).toHaveBeenCalledTimes(1)

      expect(res.body).toMatchSnapshot()
    })
  })
})
