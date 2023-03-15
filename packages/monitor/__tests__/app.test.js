//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const promClient = require('prom-client')
const app = require('../lib/app')

describe('app', () => {
  it('should clear register on destroy', () => {
    app.destroy()
    expect(promClient.register.clear).toBeCalledTimes(1)
  })
})
