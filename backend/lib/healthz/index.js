//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { format as fmt } from 'util'
import kubeClientModule from '@gardener-dashboard/kube-client'
import httpErrors from 'http-errors'
const { isHttpError } = httpErrors
const { createDashboardClient } = kubeClientModule

async function healthCheck (transitive = false) {
  const dashboardClient = createDashboardClient()

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

export { healthCheck }
