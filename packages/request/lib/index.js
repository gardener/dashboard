//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const HttpClient = require('./HttpClient')
const { extend, createHttpError, isHttpError } = HttpClient

module.exports = {
  HttpClient,
  extend,
  createHttpError,
  isHttpError
}
