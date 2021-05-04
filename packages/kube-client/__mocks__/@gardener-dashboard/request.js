//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { PassThrough } = require('stream')
const request = jest.requireActual('@gardener-dashboard/request')

const mockClient = {
  request: jest.fn(() => Promise.resolve()),
  stream: jest.fn(() => Promise.resolve(new PassThrough({ objectMode: true })))
}

module.exports = {
  ...request,
  extend: jest.fn(() => mockClient),
  mockClient
}
