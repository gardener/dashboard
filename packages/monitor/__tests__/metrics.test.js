//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const metrics = require('../lib/metrics')

describe('metrics', () => {
  it('should create and export the application defined metrics', () => {
    expect(Object.keys(metrics)).toMatchSnapshot()
  })
})
