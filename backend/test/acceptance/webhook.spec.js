//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { cache: { resetTicketCache } } = require('../../lib/cache')
const { createHubSignature } = require('../../lib/github/webhook')
const { loadOpenIssues, converter } = require('../../lib/services/tickets')
const { octokit } = require('../../lib/github')

class CacheEvent {
  constructor ({ cache, type, id, timeout = 1000 }) {
    this.cache = cache
    this.type = type
    this.id = id
    this.timeout = timeout
  }

  startWaiting () {
    const self = this

    function cleanup () {
      clearTimeout(self.timeoutObject)
      self.cache.emitter.removeListener(self.type, onEvent)
    }

    function onTimeout () {
      self._reject(new Error(`No ${self.type} event emitted`))
    }

    function onEvent (event) {
      const { object: { metadata: { id } = {} } = {} } = event
      if (!self.id || self.id === id) {
        cleanup()
        self._resolve(event)
      }
    }

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
    this.timeoutObject = setTimeout(onTimeout, this.timeout)
    this.cache.emitter.on(this.type, onEvent)
    return this.promise
  }
}

describe('github', function () {
  const { formatTime } = fixtures.helper
  const {
    gitHub: {
      webhookSecret
    }
  } = fixtures.config.default

  let agent
  let cache
  let makeSanitizedHtmlStub

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(async () => {
    cache = resetTicketCache()
    await loadOpenIssues()
    makeSanitizedHtmlStub = jest.spyOn(converter, 'makeSanitizedHtml').mockImplementation(text => text)
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
    let closedGithubIssue
    let githubIssue

    beforeEach(function () {
      octokit.paginate.mockClear()

      newGithubIssue = fixtures.github.issues.create({ number: 42 })
      const githubIssueList = fixtures.github.issues.list()
      githubIssue = _
        .chain(githubIssueList)
        .find(['number', 1])
        .cloneDeep()
        .set('updated_at', formatTime(Date.now()))
        .value()
      closedGithubIssue = _
        .chain(githubIssueList)
        .find(['number', 4])
        .cloneDeep()
        .set('updated_at', formatTime(Date.now()))
        .value()
    })

    it('should handle github webhook event "issues" action "opened"', async function () {
      githubIssue = newGithubIssue
      const body = JSON.stringify({ action: 'opened', issue: githubIssue })
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(4)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeDefined()
      expect(issue.data.body).toBe(githubIssue.body)
      expect(issueEvent.type).toBe('ADDED')
      expect(issueEvent.object).toEqual(issue)

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['This is bug #42'])
    })

    it('should handle github webhook event "issues" action "edited"', async function () {
      githubIssue.body = `This the very serious bug #${githubIssue.number}`
      const body = JSON.stringify({ action: 'edited', issue: githubIssue })
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeDefined()
      expect(issue.data.body).toBe(githubIssue.body)
      expect(issueEvent.type).toBe('MODIFIED')
      expect(issueEvent.object).toEqual(issue)

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['This the very serious bug #1'])
    })

    it('should handle github webhook event "issues" action "closed"', async function () {
      const body = JSON.stringify({ action: 'closed', issue: githubIssue })

      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(2)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeUndefined()
      expect(issueEvent.type).toBe('DELETED')

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(1)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['This is bug #1'])
    })

    it('should handle github webhook event "issues" action "reopened"', async function () {
      githubIssue = _.set(closedGithubIssue, 'state', 'open')
      const body = JSON.stringify({ action: 'reopened', issue: githubIssue })

      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      const commentEventPromise = new CacheEvent({ cache, type: 'comment', id: 1 }).startWaiting()

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      expect(octokit.paginate).toBeCalledTimes(1)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(4)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeDefined()
      expect(issue.data.body).toBe(githubIssue.body)
      expect(issueEvent.type).toBe('ADDED')
      expect(issueEvent.object).toEqual(issue)

      // comments
      const { object: comment } = await commentEventPromise
      expect(comment.metadata.number).toBe(githubIssue.number)
      expect(comment.metadata.id).toBe(1)

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(2)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['This is bug #4'])
      expect(makeSanitizedHtmlStub.mock.calls[1]).toEqual(['This is comment 1 for issue #4'])
    })
  })

  describe('event "issue_comment"', function () {
    const githubEvent = 'issue_comment'
    let githubIssue
    let githubComment
    let newGithubComment

    beforeEach(function () {
      octokit.paginate.mockClear()

      const githubIssueList = fixtures.github.issues.list()
      githubIssue = _
        .chain(githubIssueList)
        .find(['number', 2])
        .cloneDeep()
        .set('updated_at', formatTime(Date.now()))
        .value()
      newGithubComment = fixtures.github.comments.create({ id: 3, number: githubIssue.number })
      const githubIssueCommentList = fixtures.github.comments.list()
      githubComment = _
        .chain(githubIssueCommentList)
        .find({
          id: 2,
          number: githubIssue.number
        })
        .cloneDeep()
        .assign({
          updated_at: formatTime(Date.now())
        })
        .value()
    })

    it('should handle github webhook event "issue_comment" action "created"', async function () {
      githubIssue.comments = 2
      githubComment = newGithubComment
      const body = JSON.stringify({ action: 'created', issue: githubIssue, comment: githubComment })

      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      let commentEvent
      cache.emitter.once('comment', event => { commentEvent = event })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeDefined()
      expect(issue.data.comments).toBe(githubIssue.comments)
      expect(issueEvent.type).toBe('MODIFIED')
      expect(issueEvent.object).toEqual(issue)

      // comments
      const comments = cache.getCommentsForIssue({ issueNumber: githubIssue.number })
      expect(commentEvent.type).toBe('ADDED')
      expect(comments).toHaveLength(1)
      expect(comments[0]).toEqual(commentEvent.object)

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(2)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['The second bug'])
      expect(makeSanitizedHtmlStub.mock.calls[1]).toEqual(['This is comment 3 for issue #2'])
    })

    it('should handle github webhook event "issue_comment" action "deleted"', async function () {
      githubIssue.comments = 0
      const body = JSON.stringify({ action: 'deleted', issue: githubIssue, comment: githubComment })

      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })

      let commentEvent
      cache.emitter.once('comment', event => { commentEvent = event })

      await agent
        .post('/webhook')
        .set('x-github-event', githubEvent)
        .set('x-hub-signature', createHubSignature(webhookSecret, body))
        .type('application/json')
        .send(body)
        .expect(200)

      // issues
      const issues = cache.getIssues()
      expect(issues).toHaveLength(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).toBeDefined()
      expect(issue.data.comments).toBe(githubIssue.comments)
      expect(issueEvent.type).toBe('MODIFIED')
      expect(issueEvent.object).toEqual(issue)

      // comments
      const comments = cache.getCommentsForIssue({ issueNumber: githubIssue.number })
      expect(commentEvent.type).toBe('DELETED')
      expect(comments).toHaveLength(0)

      // sanitizedHtml
      expect(makeSanitizedHtmlStub).toBeCalledTimes(2)
      expect(makeSanitizedHtmlStub.mock.calls[0]).toEqual(['The second bug'])
      expect(makeSanitizedHtmlStub.mock.calls[1]).toEqual(['This is comment 2 for issue #2'])
    })
  })
})
