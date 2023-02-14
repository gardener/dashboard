//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const logger = require('../logger')
const config = require('../config')

function dateStrToMicroDateStr (dateStr) {
  const date = new Date(dateStr).toISOString()
  return `${date.slice(0, -1)}000Z`
}

async function updateLease (updateTime) {
  const { name: holderIdentity, namespace } = config.pod
  const name = 'gardener-dashboard-github-webhook'
  const body = {
    spec: {
      holderIdentity,
      renewTime: dateStrToMicroDateStr(updateTime)
    }
  }
  try {
    await dashboardClient['coordination.k8s.io'].leases.mergePatch(namespace, name, body)
  } catch (err) {
    throw createError(500, `Failed to update lease: ${err.message}`)
  }
}

async function handleGithubEvent (name, data) {
  if (['issues', 'issue_comment'].includes(name)) {
    const updatedAt = name === 'issues'
      ? data.issue?.updated_at
      : data.comment?.updated_at
    if (isNaN(new Date(updatedAt))) {
      throw createError(422, `GitHub-Event has invalid date value '${updatedAt}' in updated_at field`)
    }

    await updateLease(updatedAt)
  } else {
    throw createError(422, `GitHub-Event '${name}' is not supported by this webhook endpoint`)
  }
}

module.exports = {
  handleGithubEvent
}
