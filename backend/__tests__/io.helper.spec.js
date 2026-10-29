//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const { default: helper } = await import('../lib/io/helper.js')

describe('io/helper', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('#derivedResourceSynchronizeFactory', () => {
    const access = { namespaces: ['garden-foo'] }
    const getByUids = vi.fn()
    const synchronizeFoos = helper.derivedResourceSynchronizeFactory('Foo', {
      accessResolver: socket => socket.access,
      getByUids,
    })

    it('computes each unique uid once with the committed socket scope', () => {
      const foo = { kind: 'Foo', metadata: { name: 'foo', uid: 'foo-uid' } }
      getByUids.mockReturnValue([foo, undefined])

      expect(synchronizeFoos({ access }, ['foo-uid', 'bar-uid', 'foo-uid'])).toEqual([
        foo,
        notFound('Foo', 'bar-uid'),
      ])
      expect(getByUids).toHaveBeenCalledExactlyOnceWith(['foo-uid', 'bar-uid'], access)
    })

    it('returns not found for every unique uid when the socket has no scope', () => {
      expect(synchronizeFoos({}, ['foo-uid', 'foo-uid'])).toEqual([
        notFound('Foo', 'foo-uid'),
      ])
      expect(getByUids).not.toHaveBeenCalled()
    })
  })

  it('exports the uid not-found factory for derived resource synchronizers', () => {
    expect(helper.uidNotFoundFactory('example.test', 'Foo')('foo-uid').details).toEqual({
      uid: 'foo-uid',
      group: 'example.test',
      kind: 'Foo',
    })
  })
})

function notFound (kind, uid) {
  return {
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    message: `${kind} with uid ${uid} does not exist`,
    reason: 'NotFound',
    details: {
      uid,
      group: 'dashboard.gardener.cloud',
      kind,
    },
    code: 404,
  }
}
