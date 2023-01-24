//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const os = require('os')
const createError = require('http-errors')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const logger = require('../logger')

function dateStrToMicroDateStr (dateStr) {
  const date = new Date(dateStr).toISOString()
  return `${date.slice(0, -1)}000Z`
}

async function updateLease (updateTime) {
  const namespace = 'garden'
  const name = 'gardener-dashboard-github-webhook'
  const body = {
    spec: {
      holderIdentity: os.hostname(),
      renewTime: dateStrToMicroDateStr(updateTime)
    }
  }
  await dashboardClient['coordination.k8s.io'].leases.mergePatch(namespace, name, body)
}

async function handleGithubEvent (name, data) {
  if (['issues', 'issue_comment'].includes(name)) {
    const updatedAt = name === 'issues'
      ? data.issue?.updated_at
      : data.comment?.updated_at
    if (isNaN(new Date(updatedAt))) {
      throw createError(400, `GitHub-Event has invalid value '${updatedAt}' in updated_at field`)
    }

    await updateLease(updatedAt)
  } else {
    logger.warn(`Unhandled event: ${name}`)
    throw createError(400, `GitHub-Event '${name}' is not supported by this webhook endpoint`)
  }
}

module.exports = {
  handleGithubEvent
}
