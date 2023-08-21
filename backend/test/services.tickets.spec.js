//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const {
  deleteTickets
} = require('../lib/services/tickets')
const github = require('../lib/github')
const logger = require('../lib/logger')
const cache = require('../lib/cache')
const { filter, map, unset, find, cloneDeep } = require('lodash')

describe('services', function () {
  describe('tickets', function () {
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
      ticketCache.issues = cloneDeep(issues)
      jest.spyOn(cache, 'getTicketCache').mockReturnValue(ticketCache)
      createCommentStub = jest.spyOn(github, 'createComment').mockReturnValue()
      closeIssueStub = jest.spyOn(github, 'closeIssue').mockReturnValue()
      getIssueStub = jest.spyOn(github, 'getIssue').mockImplementation(({ number }) => {
        return Promise.resolve({
          data: find(issues, ['id', number])
        })
      })
      removeIssueSpy = jest.spyOn(ticketCache, 'removeIssue')
    })

    describe('#deleteTickets', function () {
      it('should not remove any issues', async function () {
        await deleteTickets({ projectName: 'foo', name: 'foo' })
        expect(getIssueStub).not.toBeCalled()
        expect(logger.debug).not.toBeCalled()
        expect(createCommentStub).not.toBeCalled()
        expect(closeIssueStub).not.toBeCalled()
        expect(removeIssueSpy).not.toBeCalled()
      })

      it('should create comment and close issue', async function () {
        await deleteTickets({ projectName: 'foo', name: 'bar' })
        expect(getIssueStub).toBeCalledTimes(2)
        expect(getIssueStub.mock.calls).toEqual([
          [{ number: issue1.id }],
          [{ number: issue3.id }]
        ])
        expect(logger.debug).toBeCalledTimes(2)
        expect(createCommentStub).toBeCalledTimes(1)
        expect(createCommentStub.mock.calls[0]).toEqual([{ number: issue1.id }, '_[Auto-closed due to Shoot deletion]_'])
        expect(closeIssueStub).toBeCalledTimes(1)
        expect(closeIssueStub.mock.calls[0]).toEqual([{ number: issue1.id }])
        expect(removeIssueSpy).toBeCalledTimes(1)
      })
    })
  })
})
