//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'assert'
import httpErrors from 'http-errors'
import logger from '../logger/index.js'
import kubeClientModule from '@gardener-dashboard/kube-client'
const { Unauthorized } = httpErrors
const { dashboardClient, Resources } = kubeClientModule

export async function isAuthenticated ({ token } = {}) {
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

export async function ensureUserGroups (user) {
  const { username, groups } = await isAuthenticated({
    token: user.auth.bearer,
  })
  if (username !== user.id) {
    throw new Unauthorized('Bearer token user does not match dashboard session user')
  }
  user.groups = groups ?? []
  return user.groups
}
