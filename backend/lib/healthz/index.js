//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { format: fmt } = require('util')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const { isHttpError } = require('http-errors')

async function healthCheck (transitive = false) {
  if (transitive === true) {
    try {
      await dashboardClient.healthz.get()
    } catch (err) {
      if (isHttpError(err)) {
        const { statusCode, body = '' } = err
        throw new Error(fmt('Kubernetes apiserver is not healthy. Healthz endpoint returned: %s (Status code: %s)', body, statusCode))
      }
      throw new Error(fmt('Could not reach Kubernetes apiserver healthz endpoint. Request failed with error: %s', err))
    }
  }
}

module.exports = {
  healthCheck,
}
