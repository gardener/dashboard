//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const SessionId = require('../lib/SessionId')

const objectHash = obj => fixtures.helper.hash(JSON.stringify(obj))

describe('SessionId', () => {
  const authority = 'https://foo.org'
  describe('#constructor', () => {
    it('should create an agent instance without any options', () => {
      const sessionId = new SessionId(authority)
      expect(sessionId.origin).toBe(authority)
      expect(sessionId.pathname).toBe(`/${objectHash({})}`)
      expect(sessionId.getOptions()).toEqual({})
    })

    it('should create an agent instance with options', () => {
      const options = { b: 2, a: 1 }
      const sessionId = new SessionId(authority, options)
      expect(sessionId.origin).toBe(authority)
      expect(sessionId.pathname).toBe(`/${objectHash({ a: 1, b: 2 })}`)
      expect(sessionId.getOptions()).toEqual(options)
    })

    it('should create an agent instance with id', () => {
      const options = { c: undefined, b: 2, d: null, id: '1', a: 1 }
      const sessionId = new SessionId(authority, options)
      expect(sessionId.origin).toBe(authority)
      expect(sessionId.pathname).toBe(`/${objectHash({ a: 1, b: 2 })}/1`)
      expect(sessionId.getOptions()).toEqual(options)
    })
  })
})
