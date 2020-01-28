//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const createJournalCache = require('../lib/cache/journals')

function timestamp (secondsFromNow = 0) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString().replace(/\.\d+Z$/, 'Z')
}

function createIssue ({ number, name = 'foo', namespace = 'test', updatedAt }) {
  updatedAt = updatedAt || timestamp()
  return {
    metadata: {
      number,
      updated_at: updatedAt,
      name,
      namespace
    }
  }
}

function createComment ({ number, id, updatedAt }) {
  updatedAt = updatedAt || new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  return {
    metadata: {
      number,
      id,
      updated_at: updatedAt
    }
  }
}

describe('cache', function () {
  /* eslint no-unused-expressions: 0 */
  describe('journals', function () {
    const sandbox = sinon.createSandbox()
    const firstIssue = createIssue({ number: 1 })
    const secondIssue = createIssue({ number: 2 })
    const thirdIssue = createIssue({ number: 3, name: 'bar' })
    const firstComment = createComment({ id: 42, number: 1 })
    const allIssues = [firstIssue, secondIssue, thirdIssue]
    let cache
    let emitter
    let emitSpy

    beforeEach(function () {
      cache = createJournalCache()
      emitter = cache.emitter
      emitSpy = sandbox.spy(emitter, 'emit')
      cache.addOrUpdateIssues({ issues: allIssues })
      cache.addOrUpdateComment({ issueNumber: firstComment.metadata.number, comment: firstComment })
      expect(emitSpy).to.have.callCount(4)
      expect(emitSpy.getCall(0)).to.have.been.calledWith('issue')
      expect(emitSpy.getCall(1)).to.have.been.calledWith('issue')
      expect(emitSpy.getCall(2)).to.have.been.calledWith('issue')
      expect(emitSpy.getCall(3)).to.have.been.calledWith('comment')
      emitSpy.resetHistory()
    })

    afterEach(function () {
      sandbox.restore()
    })

    describe('#onIssue', function () {
      it('should register an EventListener for "issue"', function () {
        const fn = () => {}
        const onSpy = sandbox.spy(emitter, 'on')
        cache.onIssue(fn)
        expect(onSpy).to.have.callCount(1)
        expect(onSpy.firstCall).to.have.been.calledWith('issue', fn)
      })
    })

    describe('#onComment', function () {
      it('should register an EventListener for "comment"', function () {
        const fn = () => {}
        const onSpy = sandbox.spy(emitter, 'on')
        cache.onComment(fn)
        expect(onSpy).to.have.callCount(1)
        expect(onSpy.firstCall).to.have.been.calledWith('comment', fn)
      })
    })

    describe('#getIssues', function () {
      it('should return all issues', function () {
        expect(cache.getIssues()).to.eql(allIssues)
        expect(emitSpy).to.not.have.been.called
      })
    })

    describe('#getIssue', function () {
      it('should return the first issue', function () {
        expect(cache.getIssue(1)).to.equal(firstIssue)
        expect(emitSpy).to.not.have.been.called
      })
    })

    describe('#addOrUpdateIssue', function () {
      it('should update the first issue', function () {
        const issue = _
          .chain(firstIssue)
          .cloneDeep()
          .set('metadata.updated_at', timestamp(+60))
          .value()
        cache.addOrUpdateIssue({ issue })
        expect(emitSpy).to.have.callCount(1)
        expect(emitSpy.firstCall).to.have.been.calledWith('issue', {
          kind: 'issue',
          type: 'MODIFIED',
          object: issue
        })
      })

      it('should not update the first issue', function () {
        const issue = _
          .chain(firstIssue)
          .cloneDeep()
          .set('metadata.updated_at', timestamp(-60))
          .value()
        cache.addOrUpdateIssue({ issue })
        expect(emitSpy).to.not.have.been.called
      })
    })

    describe('#removeIssue', function () {
      it('should remove the first issue', function () {
        cache.removeIssue({ issue: firstIssue })
        expect(emitSpy).to.have.callCount(2)
        expect(emitSpy.firstCall).to.have.been.calledWith('issue', {
          kind: 'issue',
          type: 'DELETED',
          object: firstIssue
        })
        expect(emitSpy.secondCall).to.have.been.calledWith('comment', {
          kind: 'comment',
          type: 'DELETED',
          object: firstComment
        })
      })
    })

    describe('#addOrUpdateComment', function () {
      it('should update the first comment', function () {
        const comment = _
          .chain(firstComment)
          .cloneDeep()
          .set('metadata.updated_at', timestamp(+60))
          .value()
        const issueNumber = comment.metadata.number
        cache.addOrUpdateComment({ issueNumber, comment })
        expect(emitSpy).to.have.callCount(1)
        expect(emitSpy.firstCall).to.have.been.calledWith('comment', {
          kind: 'comment',
          type: 'MODIFIED',
          object: comment
        })
      })

      it('should not update the first comment', function () {
        const comment = _
          .chain(firstComment)
          .cloneDeep()
          .set('metadata.updated_at', timestamp(-60))
          .value()
        const issueNumber = comment.metadata.number
        cache.addOrUpdateComment({ issueNumber, comment })
        expect(emitSpy).to.not.have.been.called
      })
    })

    describe('#removeComment', function () {
      it('should remove the first comment', function () {
        cache.removeComment({ comment: firstComment })
        expect(emitSpy).to.have.callCount(1)
        expect(emitSpy.firstCall).to.have.been.calledWith('comment', {
          kind: 'comment',
          type: 'DELETED',
          object: firstComment
        })
      })
    })

    describe('#getIssueNumbersForNameAndNamespace', function () {
      it('should return the issueNumbers for name "foo" and namespace "test"', function () {
        const numbers = cache.getIssueNumbersForNameAndNamespace({ namespace: 'test', name: 'foo' })
        expect(numbers).to.eql([1, 2])
        expect(emitSpy).to.not.have.been.called
      })
    })

    describe('#getCommentsForIssue', function () {
      it('should return the all comments for the first issue', function () {
        const comments = cache.getCommentsForIssue({ issueNumber: 1 })
        expect(comments).to.have.length(1)
        expect(comments[0]).to.eql(firstComment)
        expect(emitSpy).to.not.have.been.called
      })
    })
  })
})
