//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const { isDateValid } = require('../../utils')

function dateStrToMicroDateStr (dateStr) {
  const date = new Date(dateStr).toISOString()
  return date.replace(/Z$/, '000Z')
}

async function updateLease (updateTime) {
  const namespace = process.env.POD_NAMESPACE || 'garden'
  const name = 'gardener-dashboard-github-webhook'
  const body = {
    spec: {
      holderIdentity: process.env.POD_NAME || 'gardener-dashboard',
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
  if (!['issues', 'issue_comment'].includes(name)) {
    throw createError(422, `GitHub-Event '${name}' is not supported by this webhook endpoint`)
  }

  const obj = name === 'issues' ? data.issue : data.comment
  const updatedAt = obj?.updated_at
  if (!isDateValid(updatedAt)) {
    throw createError(422, `GitHub-Event has invalid date value '${updatedAt}' in updated_at field`)
  }

  await updateLease(updatedAt)
}

module.exports = handleGithubEvent
