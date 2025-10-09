//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import { http } from '../symbols.js'
import apiCtor from './API.js'
import healthzCtor from './Healthz.js'
import openAPICtor from './OpenAPI.js'

export const endpoints = {
  api: {
    Ctor: apiCtor,
    responseType: 'json',
  },
  healthz: {
    Ctor: healthzCtor,
  },
  openapi: {
    Ctor: openAPICtor,
    responseType: 'json',
  },
}

function load (clientConfig, options) {
  const createInstance = ({ Ctor, ...rest }) => new Ctor(clientConfig.extend({
    ...options,
    ...rest,
    relativeUrl: Ctor[http.relativeUrl],
  }))
  return _.mapValues(endpoints, createInstance)
}

export function assign (object, ...args) {
  return Object.assign(object, load(...args))
}
