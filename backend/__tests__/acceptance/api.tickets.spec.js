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
import {
  mockListIssues,
  mockListComments,
} from '@octokit/core'
import { seedProjectNamespaceIndex } from '../helpers/cache.js'
import cache from '../../lib/cache/index.js'
import * as authorization from '../../lib/services/authorization.js'
import * as tickets from '../../lib/services/tickets.js'

describe('api', function () {
  let agent

  beforeAll(async () => {
    agent = await createAgent()
    vi.spyOn(cache, 'getProjects').mockReturnValue(fixtures.projects.list())
    seedProjectNamespaceIndex()
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
    vi.clearAllMocks()
  })

  describe('tickets', function () {
    const user = fixtures.auth.createUser({
      id: 'foo@example.org',
    })

    it('should fetch open issues for all namespaces when user can list projects', async () => {
      const namespace = '_all'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(true)

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockListIssues).toHaveBeenCalledTimes(1)
      expect(mockListComments).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should fetch only member project issues for all namespaces when user cannot list projects', async () => {
      const namespace = '_all'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(false)

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(res.body.issues.map(issue => issue.metadata.projectName)).not.toContain('foobar')
      expect(res.body).toMatchSnapshot()
    })

    it('should fetch open issues for namespace foo', async () => {
      const namespace = 'garden-foo'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(true)

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockListIssues).toHaveBeenCalledTimes(1)
      expect(mockListComments).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should return 403 for namespace the user is not a member of', async () => {
      const namespace = 'garden-GroupMember1'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(false)

      const result = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
      expect(result.status).toEqual(403)
    })

    it('should return 403 for a namespace that does not exist', async () => {
      const namespace = 'garden-nonexistent'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(false)

      const result = await agent
        .get(`/api/namespaces/${namespace}/tickets`)
        .set('cookie', await user.cookie)
      expect(result.status).toEqual(403)
    })

    it('should fetch open issues and comments for shoot cluster test in namespace bar', async () => {
      const namespace = 'garden-bar'
      const name = 'test'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(true)

      const res = await agent
        .get(`/api/namespaces/${namespace}/tickets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(res.body).toMatchSnapshot()
    })

    it('should return 403 for /:name when user is not a member of the namespace', async () => {
      const namespace = 'garden-GroupMember1'
      const name = 'test'
      vi.spyOn(authorization, 'canListProjects').mockResolvedValueOnce(false)

      const result = await agent
        .get(`/api/namespaces/${namespace}/tickets/${name}`)
        .set('cookie', await user.cookie)
      expect(result.status).toEqual(403)
    })
  })
})
