//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const {
  deleteTickets
} = require('../lib/services/tickets')
const github = require('../lib/github')
const logger = require('../lib/logger')
const cache = require('../lib/cache')
const { filter, map, unset } = require('lodash')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('tickets', function () {
    let debugSpy
    let getIssueStub
    let removeIssueSpy
    let createCommentStub
    let closeIssueStub

    const issue1 = { id: 1, projectName: 'foo', name: 'bar' }
    const issue2 = { id: 2, projectName: 'foo', name: 'baz' }
    const issue3 = { id: 3, projectName: 'foo', name: 'bar', state: 'closed' }
    const issues = [
      issue1,
      issue2,
      issue3
    ]

    const ticketCache = {
      issues: [],
      getIssues () {
        return this.issues
      },
      getIssueNumbersForNameAndProjectName ({ projectName, name }) {
        const issues = filter(this.issues, { projectName, name })
        return map(issues, 'id')
      },
      removeIssue ({ issue }) {
        unset(issues, issue.id)
      }
    }

    beforeEach(function () {
      debugSpy = sandbox.spy(logger, 'debug')
      createCommentStub = sandbox.stub(github, 'createComment')
      closeIssueStub = sandbox.stub(github, 'closeIssue')
      getIssueStub = sandbox.stub(github, 'getIssue')
      sandbox.stub(cache, 'getTicketCache').returns(ticketCache)
      ticketCache.issues = issues
      removeIssueSpy = sandbox.spy(ticketCache, 'removeIssue')
    })

    describe('#deleteTickets', function () {
      it('should not remove any issues', async function () {
        await deleteTickets({ projectName: 'foo', name: 'foo' })
        expect(debugSpy).to.not.be.called
        expect(createCommentStub).to.not.be.called
        expect(closeIssueStub).to.not.be.called
        expect(removeIssueSpy).to.not.be.called
      })

      it('should create comment and close issue', async function () {
        getIssueStub.withArgs({ number: 1 }).returns({
          data: issue1
        })
        getIssueStub.withArgs({ number: 3 }).returns({
          data: issue3
        })
        createCommentStub.withArgs({ number: issue1.id }, '_[Auto-closed due to Shoot deletion]_')
        closeIssueStub.withArgs({ number: issue1.id })

        await deleteTickets({ projectName: 'foo', name: 'bar' })
        expect(debugSpy).to.be.calledTwice
        expect(createCommentStub).to.be.calledWith({ number: issue1.id }, '_[Auto-closed due to Shoot deletion]_')
        expect(closeIssueStub).to.be.calledWith({ number: issue1.id })
        expect(removeIssueSpy).to.be.calledOnce
      })
    })
  })
})
