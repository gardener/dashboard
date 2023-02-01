//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('../lib/metrics')

const hooks = require('../lib/hooks')
const metrics = require('../lib/metrics')

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should export a LifecycleHooks-like object', () => {
    expect(hooks.cleanup).toEqual(expect.any(Function))
    expect(hooks.cleanup.length).toEqual(0)
    expect(hooks.beforeListen).toEqual(expect.any(Function))
    expect(hooks.beforeListen.length).toEqual(1)
  })

  it('should call metrics.start on beforeListen', () => {
    hooks.beforeListen()
    expect(metrics.start).toBeCalledTimes(1)
  })

  it('should call metrics.stop on cleanup', () => {
    hooks.cleanup()
    expect(metrics.stop).toBeCalledTimes(1)
  })
})
