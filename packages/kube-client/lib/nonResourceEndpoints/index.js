//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { http } = require('../symbols')

const endpoints = {
  api: {
    Ctor: require('./API'),
    responseType: 'json'
  },
  healthz: {
    Ctor: require('./Healthz')
  },
  openapi: {
    Ctor: require('./OpenAPI'),
    responseType: 'json'
  }
}

function load (clientConfig, options) {
  const createInstance = ({ Ctor, ...rest }) => new Ctor(clientConfig.extend({
    ...options,
    ...rest,
    relativeUrl: Ctor[http.relativeUrl]
  }))
  return _.mapValues(endpoints, createInstance)
}

exports.assign = (object, ...args) => {
  return Object.assign(object, load(...args))
}
