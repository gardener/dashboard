//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { createApp } = require('../lib/app')

describe('app', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an express app', () => {
    const port = 4242
    const periodSeconds = 42
    const app = createApp({ port, periodSeconds })

    expect(app.get('port')).toEqual(port)
    expect(app.get('periodSeconds')).toEqual(periodSeconds)
  })
})
