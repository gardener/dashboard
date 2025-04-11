//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const { Unauthorized } = require('http-errors')
const logger = require('../logger')
const {
  createDashboardClient,
  Resources,
} = require('@gardener-dashboard/kube-client')

exports.isAuthenticated = async function ({ token } = {}, workspace) {
  const dashboardClient = createDashboardClient(workspace)
  const { apiVersion, kind } = Resources.TokenReview
  const body = {
    kind,
    apiVersion,
    metadata: {
      name: `token-${Date.now()}`,
    },
    spec: {
      token,
    },
  }
  try {
    const {
      status: {
        user = {},
        authenticated = false,
        error = 'User not authenticated',
      } = {},
    } = await dashboardClient['authentication.k8s.io'].tokenreviews.create(body)
    assert.strictEqual(authenticated, true, error)
    assert.ok(user.username, 'User authenticated but username is empty')
    return user
  } catch (err) {
    logger.error('Authentication Error:', err.message)
    throw new Unauthorized(err.message)
  }
}
