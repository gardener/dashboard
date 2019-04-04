//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const _ = require('lodash')
const common = require('../support/common')
const { createHubSignature } = require('../../lib/github/webhook')
const { loadOpenIssues } = require('../../lib/services/journals')
const { webhookSecret, createGithubIssue, createGithubComment, githubIssueList, githubIssueCommentList, formatTime } = nocks.github

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
      const {object: {metadata: {id} = {}} = {}} = event
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

module.exports = function ({ agent, sandbox }) {
  /* eslint no-unused-expressions: 0 */
  let cache

  beforeEach(async function () {
    cache = common.stub.getJournalCache(sandbox)
    nocks.github.stub.getIssues({state: 'open'})
    await loadOpenIssues()
  })

  it('should initialize the cache with all open issues', function () {
    const issues = cache.getIssues()
    expect(issues).to.have.length(3)
  })

  describe('event "issues"', function () {
    const githubEvent = 'issues'
    let newGithubIssue, closedGithubIssue, githubIssue

    beforeEach(function () {
      newGithubIssue = createGithubIssue({number: 42})
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
      const body = JSON.stringify({action: 'opened', issue: githubIssue})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      const issues = cache.getIssues()
      expect(issues).to.have.length(4)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.not.undefined
      expect(issue.data.body).to.equal(githubIssue.body)
      expect(issueEvent.type).to.equal('ADDED')
      expect(issueEvent.object).to.eql(issue)
    })

    it('should handle github webhook event "issues" action "edited"', async function () {
      githubIssue.body = `This the very serious bug #${githubIssue.number}`
      const body = JSON.stringify({action: 'edited', issue: githubIssue})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      const issues = cache.getIssues()
      expect(issues).to.have.length(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.not.undefined
      expect(issue.data.body).to.equal(githubIssue.body)
      expect(issueEvent.type).to.equal('MODIFIED')
      expect(issueEvent.object).to.eql(issue)
    })

    it('should handle github webhook event "issues" action "closed"', async function () {
      const body = JSON.stringify({action: 'closed', issue: githubIssue})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      const issues = cache.getIssues()
      expect(issues).to.have.length(2)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.undefined
      expect(issueEvent.type).to.equal('DELETED')
    })

    it('should handle github webhook event "issues" action "reopened"', async function () {
      githubIssue = _.set(closedGithubIssue, 'state', 'open')
      const body = JSON.stringify({action: 'reopened', issue: githubIssue})
      nocks.github.stub.getComments({number: githubIssue.number})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      const commentEventPromise = new CacheEvent({cache, type: 'comment', id: 1}).startWaiting()
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      const issues = cache.getIssues()
      expect(issues).to.have.length(4)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.not.undefined
      expect(issue.data.body).to.equal(githubIssue.body)
      expect(issueEvent.type).to.equal('ADDED')
      expect(issueEvent.object).to.eql(issue)
      const {object: comment} = await commentEventPromise
      expect(comment.metadata.number).to.equal(githubIssue.number)
      expect(comment.metadata.id).to.equal(1)
    })
  })

  describe('event "issue_comment"', function () {
    const githubEvent = 'issue_comment'
    let githubIssue, githubComment, newGithubComment

    beforeEach(function () {
      githubIssue = _
        .chain(githubIssueList)
        .find(['number', 2])
        .cloneDeep()
        .set('updated_at', formatTime(Date.now()))
        .value()
      newGithubComment = createGithubComment({id: 3, number: githubIssue.number})
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
      const body = JSON.stringify({action: 'created', issue: githubIssue, comment: githubComment})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      let commentEvent
      cache.emitter.once('comment', event => { commentEvent = event })
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      // issues
      const issues = cache.getIssues()
      expect(issues).to.have.length(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.not.undefined
      expect(issue.data.comments).to.equal(githubIssue.comments)
      expect(issueEvent.type).to.equal('MODIFIED')
      expect(issueEvent.object).to.eql(issue)
      // comments
      const comments = cache.getCommentsForIssue({issueNumber: githubIssue.number})
      expect(commentEvent.type).to.equal('ADDED')
      expect(comments).to.have.length(1)
      expect(comments[0]).to.eql(commentEvent.object)
    })

    it('should handle github webhook event "issue_comment" action "deleted"', async function () {
      githubIssue.comments = 0
      const body = JSON.stringify({action: 'deleted', issue: githubIssue, comment: githubComment})
      let issueEvent
      cache.emitter.once('issue', event => { issueEvent = event })
      let commentEvent
      cache.emitter.once('comment', event => { commentEvent = event })
      let res
      try {
        res = await agent
          .post('/webhook')
          .set('x-github-event', githubEvent)
          .set('x-hub-signature', createHubSignature(webhookSecret, body))
          .type('application/json')
          .send(body)
      } catch (err) {
        res = err.response
      }
      expect(res).to.have.status(200)
      // issues
      const issues = cache.getIssues()
      expect(issues).to.have.length(3)
      const issue = _.find(issues, ['metadata.number', githubIssue.number])
      expect(issue).to.be.not.undefined
      expect(issue.data.comments).to.equal(githubIssue.comments)
      expect(issueEvent.type).to.equal('MODIFIED')
      expect(issueEvent.object).to.eql(issue)
      // comments
      const comments = cache.getCommentsForIssue({issueNumber: githubIssue.number})
      expect(commentEvent.type).to.equal('DELETED')
      expect(comments).to.be.empty
    })
  })
}
