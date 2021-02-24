//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Healthz = require('./Healthz')
const OpenAPI = require('./OpenAPI')

function load (options) {
  return {
    healthz: new Healthz(options),
    openapi: new OpenAPI(options)
  }
}

exports.assign = (object, options) => {
  return Object.assign(object, load(options))
}
