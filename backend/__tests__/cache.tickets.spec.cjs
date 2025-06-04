//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const _ = require('lodash')
const createTicketCache = require('../dist/lib/cache/tickets')

function timestamp (secondsFromNow = 0) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString().replace(/\.\d+Z$/, 'Z')
}

function createIssue ({ number, name = 'foo', projectName = 'test', updatedAt }) {
  updatedAt = updatedAt || timestamp()
  return {
    metadata: {
      number,
      updated_at: updatedAt,
      name,
      projectName,
    },
  }
}

function createComment ({ number, id, updatedAt }) {
  updatedAt = updatedAt || new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  return {
    metadata: {
      number,
      id,
      updated_at: updatedAt,
    },
  }
}

describe('cache', function () {
  describe('tickets', function () {
    const firstIssue = createIssue({ number: 1 })
    const secondIssue = createIssue({ number: 2 })
    const thirdIssue = createIssue({ number: 3, name: 'bar' })
    const firstComment = createComment({ id: 42, number: 1 })
    const allIssues = [firstIssue, secondIssue, thirdIssue]
    let cache
    let emitter
    let emitSpy

    beforeEach(function () {
      cache = createTicketCache()
      emitter = cache.emitter
      emitSpy = jest.spyOn(emitter, 'emit')
      cache.addOrUpdateIssues({ issues: allIssues })
      cache.addOrUpdateComment({ issueNumber: firstComment.metadata.number, comment: firstComment })
      assert.strictEqual(emitSpy.mock.calls.length, 4)
      emitSpy.mockClear()
    })

    describe('#onIssue', function () {
      it('should register an EventListener for "issue"', function () {
        const fn = () => {}
        const onSpy = jest.spyOn(emitter, 'on')
        cache.on('issue', fn)
        expect(onSpy).toHaveBeenCalledTimes(1)
        expect(onSpy.mock.calls[0]).toEqual(['issue', fn])
      })
    })

    describe('#onComment', function () {
      it('should register an EventListener for "comment"', function () {
        const fn = () => {}
        const onSpy = jest.spyOn(emitter, 'on')
        cache.on('comment', fn)
        expect(onSpy).toHaveBeenCalledTimes(1)
        expect(onSpy.mock.calls[0]).toEqual(['comment', fn])
      })
    })

    describe('#getIssues', function () {
      it('should return all issues', function () {
        expect(cache.getIssues()).toEqual(allIssues)
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe('#getIssue', function () {
      it('should return the first issue', function () {
        expect(cache.getIssue(1)).toBe(firstIssue)
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe('#addOrUpdateIssue', function () {
      it('should update the first issue', function () {
        const issue = _
          .chain(firstIssue)
          .cloneDeep()
          .set(['metadata', 'updated_at'], timestamp(+60))
          .value()
        cache.addOrUpdateIssue({ issue })
        expect(emitSpy).toHaveBeenCalledTimes(1)
        expect(emitSpy.mock.calls[0]).toEqual(['issue', {
          kind: 'issue',
          type: 'MODIFIED',
          object: issue,
        }])
      })

      it('should not update the first issue', function () {
        const issue = _
          .chain(firstIssue)
          .cloneDeep()
          .set(['metadata', 'updated_at'], timestamp(-60))
          .value()
        cache.addOrUpdateIssue({ issue })
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe('#removeIssue', function () {
      it('should remove the first issue', function () {
        cache.removeIssue({ issue: firstIssue })
        expect(emitSpy).toHaveBeenCalledTimes(2)
        expect(emitSpy.mock.calls[0]).toEqual(['issue', {
          kind: 'issue',
          type: 'DELETED',
          object: firstIssue,
        }])
        expect(emitSpy.mock.calls[1]).toEqual(['comment', {
          kind: 'comment',
          type: 'DELETED',
          object: firstComment,
        }])
      })
    })

    describe('#addOrUpdateComment', function () {
      it('should update the first comment', function () {
        const comment = _
          .chain(firstComment)
          .cloneDeep()
          .set(['metadata', 'updated_at'], timestamp(+60))
          .value()
        const issueNumber = comment.metadata.number
        cache.addOrUpdateComment({ issueNumber, comment })
        expect(emitSpy).toHaveBeenCalledTimes(1)
        expect(emitSpy.mock.calls[0]).toEqual(['comment', {
          kind: 'comment',
          type: 'MODIFIED',
          object: comment,
        }])
      })

      it('should not update the first comment', function () {
        const comment = _
          .chain(firstComment)
          .cloneDeep()
          .set(['metadata', 'updated_at'], timestamp(-60))
          .value()
        const issueNumber = comment.metadata.number
        cache.addOrUpdateComment({ issueNumber, comment })
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe('#removeComment', function () {
      it('should remove the first comment', function () {
        cache.removeComment({ comment: firstComment })
        expect(emitSpy).toHaveBeenCalledTimes(1)
        expect(emitSpy.mock.calls[0]).toEqual(['comment', {
          kind: 'comment',
          type: 'DELETED',
          object: firstComment,
        }])
      })
    })

    describe('#getIssueNumbersForNameAndProjectName', function () {
      it('should return the issueNumbers for name "foo" and project "test"', function () {
        const numbers = cache.getIssueNumbersForNameAndProjectName({ projectName: 'test', name: 'foo' })
        expect(numbers).toEqual([1, 2])
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })

    describe('#getCommentsForIssue', function () {
      it('should return the all comments for the first issue', function () {
        const comments = cache.getCommentsForIssue({ issueNumber: 1 })
        expect(comments).toHaveLength(1)
        expect(comments[0]).toEqual(firstComment)
        expect(emitSpy).not.toHaveBeenCalled()
      })
    })
  })
})
